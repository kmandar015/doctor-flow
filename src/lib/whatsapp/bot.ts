import "server-only";

import {
  createAppointment,
  getAppointment,
  updateAppointmentStatus,
} from "@/lib/database/appointments";
import {
  defaultAvailability,
  getAvailableSlots,
  getDoctorAvailability,
} from "@/lib/database/availability";
import { getDatabase } from "@/lib/database/db";
import { getDoctorById } from "@/lib/database/doctors";
import { getPatientFollowUps } from "@/lib/database/followUps";
import { getPatientAppointments, getPatientByPhone } from "@/lib/database/patients";
import { addDaysISO, isPastSlot, todayISO } from "@/lib/dates";
import { sendWhatsAppText } from "./client";
import {
  attachMessagesToPatient,
  logMessage,
  type MessageKind,
} from "./messages";
import { dayNames, friendlyDate, friendlyTime } from "./text";

/**
 * The WhatsApp assistant: a numbered menu, one step at a time.
 *
 *   MENU ── 1 ──> (ASK_NAME) ──> PICK_DATE ──> PICK_TIME ──> ASK_REASON ──> booked
 *        ── 2 ──> upcoming appointments
 *        ── 3 ──> pending follow-ups
 *        ── 4 ──> PICK_CANCEL ──> cancelled
 *        ── 5 ──> clinic timings
 *
 * "0", "menu" or "hi" always returns to the menu. Conversation state lives in
 * whatsapp_sessions and resets after 30 minutes of silence.
 */

type Step = "MENU" | "ASK_NAME" | "PICK_DATE" | "PICK_TIME" | "ASK_REASON" | "PICK_CANCEL";

type SessionData = {
  name?: string;
  dates?: string[];
  date?: string;
  slots?: string[];
  time?: string;
  cancelIds?: string[];
};

type Session = { step: Step; data: SessionData; isNew: boolean };

type Reply = { body: string; kind?: MessageKind; appointmentId?: string };

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_DATE_OPTIONS = 6;
const DATE_SEARCH_DAYS = 14;

// ─── Session storage ──────────────────────────────────────────────────────────

function loadSession(doctorId: string, phone: string): Session {
  const row = getDatabase()
    .prepare("SELECT step, data, updated_at FROM whatsapp_sessions WHERE doctor_id = ? AND phone = ?")
    .get(doctorId, phone) as { step: Step; data: string; updated_at: string } | undefined;
  if (!row) return { step: "MENU", data: {}, isNew: true };
  if (Date.now() - new Date(row.updated_at).getTime() > SESSION_TIMEOUT_MS) {
    return { step: "MENU", data: {}, isNew: false };
  }
  return { step: row.step, data: JSON.parse(row.data) as SessionData, isNew: false };
}

function saveSession(doctorId: string, phone: string, step: Step, data: SessionData = {}) {
  getDatabase()
    .prepare(
      `INSERT INTO whatsapp_sessions (doctor_id, phone, step, data, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(doctor_id, phone) DO UPDATE SET step = excluded.step, data = excluded.data, updated_at = excluded.updated_at`,
    )
    .run(doctorId, phone, step, JSON.stringify(data), new Date().toISOString());
}

// ─── Text ─────────────────────────────────────────────────────────────────────

function menuText(doctorId: string, greet: boolean) {
  const doctor = getDoctorById(doctorId);
  const intro = greet
    ? `👋 Welcome to *${doctor?.clinicName ?? "our clinic"}*! I'm the WhatsApp assistant for ${doctor?.name ?? "the doctor"}.\n\n`
    : "";
  return (
    `${intro}How can I help? Reply with a number:\n\n` +
    "1️⃣ Book an appointment\n" +
    "2️⃣ My appointments\n" +
    "3️⃣ My follow-ups\n" +
    "4️⃣ Cancel an appointment\n" +
    "5️⃣ Clinic timings\n\n" +
    "Reply *0* at any time to see this menu again."
  );
}

const numbered = (items: string[]) =>
  items.map((item, index) => `${index + 1}. ${item}`).join("\n");

function pickNumber(text: string, count: number) {
  const n = Number.parseInt(text.trim(), 10);
  return Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : null;
}

// ─── Flows ────────────────────────────────────────────────────────────────────

function upcomingAppointments(doctorId: string, patientId: string) {
  const today = todayISO();
  return getPatientAppointments(doctorId, patientId)
    .filter(
      (a) =>
        a.appointmentDate >= today &&
        !isPastSlot(a.appointmentDate, a.appointmentTime) &&
        (a.status === "PENDING" || a.status === "CONFIRMED"),
    )
    .sort((a, b) =>
      `${a.appointmentDate}${a.appointmentTime}`.localeCompare(
        `${b.appointmentDate}${b.appointmentTime}`,
      ),
    );
}

function offerDates(doctorId: string, phone: string, data: SessionData): Reply[] {
  const today = todayISO();
  const dates: string[] = [];
  for (let i = 0; i < DATE_SEARCH_DAYS && dates.length < MAX_DATE_OPTIONS; i++) {
    const date = addDaysISO(today, i);
    if (getAvailableSlots(doctorId, date).length) dates.push(date);
  }
  if (!dates.length) {
    saveSession(doctorId, phone, "MENU");
    const doctor = getDoctorById(doctorId);
    return [
      {
        body: `Sorry, there are no free slots in the next two weeks. Please call the clinic${doctor?.phone ? ` on ${doctor.phone}` : ""}.`,
      },
    ];
  }
  saveSession(doctorId, phone, "PICK_DATE", { ...data, dates });
  const labels = dates.map((d) => (d === today ? `Today (${friendlyDate(d)})` : friendlyDate(d)));
  return [{ body: `📅 Which day works for you?\n\n${numbered(labels)}\n\nReply with the number.` }];
}

function offerTimes(doctorId: string, phone: string, data: SessionData, date: string): Reply[] {
  const slots = getAvailableSlots(doctorId, date);
  if (!slots.length) {
    return [{ body: "That day just filled up." }, ...offerDates(doctorId, phone, data)];
  }
  saveSession(doctorId, phone, "PICK_TIME", { ...data, date, slots });
  return [
    {
      body: `🕒 Free times on *${friendlyDate(date)}*:\n\n${numbered(slots.map(friendlyTime))}\n\nReply with the number.`,
    },
  ];
}

function startBooking(doctorId: string, phone: string): Reply[] {
  const patient = getPatientByPhone(doctorId, phone);
  if (!patient) {
    saveSession(doctorId, phone, "ASK_NAME");
    return [{ body: "Happy to help you book! First, what is the patient's *full name*?" }];
  }
  return offerDates(doctorId, phone, { name: patient.name });
}

function book(doctorId: string, phone: string, data: SessionData, reason?: string): Reply[] {
  if (!data.date || !data.time || !data.name) return startBooking(doctorId, phone);
  try {
    const appointment = createAppointment(doctorId, {
      patient: { name: data.name, phone },
      appointmentDate: data.date,
      appointmentTime: data.time,
      reason,
      source: "WHATSAPP",
    });
    attachMessagesToPatient(doctorId, phone);
    saveSession(doctorId, phone, "MENU");
    const doctor = getDoctorById(doctorId);
    return [
      {
        kind: "BOOKING_REQUESTED",
        appointmentId: appointment.id,
        body:
          `✅ *Request received!*\n\n` +
          `📅 ${friendlyDate(data.date)} at ${friendlyTime(data.time)}\n` +
          `👩‍⚕️ ${doctor?.name ?? "Doctor"}, ${doctor?.clinicName ?? ""}\n\n` +
          "You'll get a message here as soon as the doctor confirms. Reply *0* for the menu.",
      },
    ];
  } catch {
    // The slot was taken (or became invalid) while the patient was choosing.
    return [
      { body: "Sorry, that time was just taken. Please pick another one." },
      ...offerTimes(doctorId, phone, { name: data.name }, data.date),
    ];
  }
}

function listMyAppointments(doctorId: string, phone: string): Reply[] {
  const patient = getPatientByPhone(doctorId, phone);
  const upcoming = patient ? upcomingAppointments(doctorId, patient.id) : [];
  if (!upcoming.length) {
    return [{ body: "You have no upcoming appointments. Reply *1* to book one." }];
  }
  const lines = upcoming.map(
    (a) =>
      `${friendlyDate(a.appointmentDate)} at ${friendlyTime(a.appointmentTime)} · ${a.status === "CONFIRMED" ? "✅ Confirmed" : "⏳ Awaiting confirmation"}`,
  );
  return [{ body: `📋 Your upcoming appointments:\n\n${numbered(lines)}\n\nReply *4* to cancel one, or *0* for the menu.` }];
}

function listMyFollowUps(doctorId: string, phone: string): Reply[] {
  const patient = getPatientByPhone(doctorId, phone);
  const pending = patient
    ? getPatientFollowUps(doctorId, patient.id)
        .filter((f) => f.status === "PENDING")
        .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
    : [];
  if (!pending.length) {
    return [{ body: "You have no pending follow-ups. Reply *0* for the menu." }];
  }
  const today = todayISO();
  const lines = pending.map(
    (f) =>
      `${friendlyDate(f.followUpDate)}${f.followUpDate < today ? " (overdue)" : ""}${f.reason ? ` · ${f.reason}` : ""}`,
  );
  return [{ body: `🩺 Your follow-ups:\n\n${numbered(lines)}\n\nReply *1* to book a visit for your follow-up.` }];
}

function startCancel(doctorId: string, phone: string): Reply[] {
  const patient = getPatientByPhone(doctorId, phone);
  const upcoming = patient ? upcomingAppointments(doctorId, patient.id) : [];
  if (!upcoming.length) {
    return [{ body: "You have no upcoming appointments to cancel. Reply *0* for the menu." }];
  }
  saveSession(doctorId, phone, "PICK_CANCEL", { cancelIds: upcoming.map((a) => a.id) });
  const lines = upcoming.map((a) => `${friendlyDate(a.appointmentDate)} at ${friendlyTime(a.appointmentTime)}`);
  return [{ body: `Which appointment should I cancel?\n\n${numbered(lines)}\n\nReply with the number, or *0* to keep them all.` }];
}

function cancelPicked(doctorId: string, phone: string, appointmentId: string): Reply[] {
  saveSession(doctorId, phone, "MENU");
  const appointment = getAppointment(doctorId, appointmentId);
  const result = updateAppointmentStatus(doctorId, appointmentId, "CANCELLED");
  if (!appointment || result.kind !== "updated") {
    return [{ body: "That appointment can no longer be cancelled here. Please call the clinic." }];
  }
  return [
    {
      kind: "APPOINTMENT_CANCELLED",
      appointmentId,
      body: `❌ Cancelled your appointment on ${friendlyDate(appointment.appointmentDate)} at ${friendlyTime(appointment.appointmentTime)}.\n\nReply *1* to book a new time.`,
    },
  ];
}

function clinicTimings(doctorId: string): Reply[] {
  const a = getDoctorAvailability(doctorId) ?? defaultAvailability(doctorId);
  const doctor = getDoctorById(doctorId);
  const days = [...a.workingDays].sort().map((d) => dayNames[d]).join(", ");
  const lunch =
    a.breakStart && a.breakEnd
      ? `\n☕ Break: ${friendlyTime(a.breakStart)} – ${friendlyTime(a.breakEnd)}`
      : "";
  return [
    {
      body:
        `🏥 *${doctor?.clinicName ?? "Clinic"}*\n` +
        `📆 ${days}\n🕘 ${friendlyTime(a.workStart)} – ${friendlyTime(a.workEnd)}${lunch}` +
        `${doctor?.phone ? `\n📞 ${doctor.phone}` : ""}\n\nReply *1* to book an appointment.`,
    },
  ];
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const MENU_WORDS = new Set(["0", "menu", "hi", "hii", "hello", "hey", "start", "namaste", "back"]);

function reply(doctorId: string, phone: string, rawText: string): Reply[] {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const session = loadSession(doctorId, phone);

  if (MENU_WORDS.has(lower) || session.isNew) {
    saveSession(doctorId, phone, "MENU");
    return [{ body: menuText(doctorId, session.isNew || lower !== "0") }];
  }

  switch (session.step) {
    case "ASK_NAME": {
      const name = text.replace(/\s+/g, " ");
      if (name.length < 2 || name.length > 80 || /\d/.test(name)) {
        return [{ body: "Please type the patient's full name, for example *Aarav Mehta*." }];
      }
      return offerDates(doctorId, phone, { name });
    }
    case "PICK_DATE": {
      const dates = session.data.dates ?? [];
      const index = pickNumber(text, dates.length);
      if (index === null) return [{ body: `Please reply with a number from 1 to ${dates.length}, or *0* for the menu.` }];
      return offerTimes(doctorId, phone, session.data, dates[index]);
    }
    case "PICK_TIME": {
      const slots = session.data.slots ?? [];
      const index = pickNumber(text, slots.length);
      if (index === null) return [{ body: `Please reply with a number from 1 to ${slots.length}, or *0* for the menu.` }];
      saveSession(doctorId, phone, "ASK_REASON", { ...session.data, time: slots[index] });
      return [{ body: "📝 Briefly, what is the reason for the visit?\n\n(Reply *skip* to leave it blank.)" }];
    }
    case "ASK_REASON": {
      const reason = lower === "skip" ? undefined : text.slice(0, 200);
      return book(doctorId, phone, session.data, reason);
    }
    case "PICK_CANCEL": {
      const ids = session.data.cancelIds ?? [];
      const index = pickNumber(text, ids.length);
      if (index === null) return [{ body: `Please reply with a number from 1 to ${ids.length}, or *0* to keep your appointments.` }];
      return cancelPicked(doctorId, phone, ids[index]);
    }
    case "MENU":
    default:
      if (lower === "1" || lower.includes("book")) return startBooking(doctorId, phone);
      if (lower === "2" || lower.includes("appointment")) return listMyAppointments(doctorId, phone);
      if (lower === "3" || lower.includes("follow")) return listMyFollowUps(doctorId, phone);
      if (lower === "4" || lower.includes("cancel")) return startCancel(doctorId, phone);
      if (lower === "5" || lower.includes("timing") || lower.includes("hours")) return clinicTimings(doctorId);
      return [{ body: `Sorry, I didn't catch that. ${menuText(doctorId, false)}` }];
  }
}

/**
 * Handles one incoming WhatsApp text: logs it, works out the replies, and
 * sends them. `phone` must already be normalized (E.164).
 */
export async function handleIncomingMessage(input: {
  doctorId: string;
  phone: string;
  text: string;
  providerMessageId?: string;
}) {
  logMessage({
    doctorId: input.doctorId,
    phone: input.phone,
    direction: "IN",
    kind: "PATIENT",
    body: input.text,
    status: "RECEIVED",
    providerMessageId: input.providerMessageId,
  });

  let replies: Reply[];
  try {
    replies = reply(input.doctorId, input.phone, input.text);
  } catch (error) {
    console.error("WhatsApp bot error:", error);
    replies = [{ body: "Sorry, something went wrong on our side. Please try again, or reply *0* for the menu." }];
  }

  for (const r of replies) {
    await sendWhatsAppText(input.phone, r.body, {
      doctorId: input.doctorId,
      kind: r.kind ?? "BOT_REPLY",
      appointmentId: r.appointmentId,
    });
  }
  return replies;
}
