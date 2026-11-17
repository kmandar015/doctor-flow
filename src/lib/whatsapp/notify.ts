import "server-only";

import { getDatabase } from "@/lib/database/db";
import { getDoctorById } from "@/lib/database/doctors";
import type { Appointment, FollowUp, Patient } from "@/lib/database/types";
import { addDaysISO, isPastSlot, todayISO } from "@/lib/dates";
import { sendWhatsAppText } from "./client";
import { getWhatsAppConfig } from "./config";
import { friendlyDate, friendlyTime } from "./text";

/**
 * Messages sent to patients when the doctor acts in the dashboard, and the
 * reminders. Each one is logged in whatsapp_messages; none of them throws.
 */

const when = (a: Appointment) =>
  `${friendlyDate(a.appointmentDate)} at ${friendlyTime(a.appointmentTime)}`;

function signature(doctorId: string) {
  const doctor = getDoctorById(doctorId);
  return doctor ? `${doctor.name}, ${doctor.clinicName}` : "the clinic";
}

export async function notifyAppointmentStatus(appointment: Appointment) {
  const doctorId = appointment.doctorId;
  const by = signature(doctorId);
  const messages: Partial<Record<Appointment["status"], { kind: Parameters<typeof sendWhatsAppText>[2]["kind"]; body: string }>> = {
    CONFIRMED: {
      kind: "APPOINTMENT_CONFIRMED",
      body: `✅ *Appointment confirmed*\n\n📅 ${when(appointment)}\n👩‍⚕️ ${by}\n\nPlease arrive 10 minutes early. Reply *4* if you need to cancel.`,
    },
    REJECTED: {
      kind: "APPOINTMENT_REJECTED",
      body: `Sorry, ${by} is not available on ${when(appointment)}.\n\nReply *1* to choose another time.`,
    },
    CANCELLED: {
      kind: "APPOINTMENT_CANCELLED",
      body: `❌ Your appointment on ${when(appointment)} has been cancelled by the clinic.\n\nReply *1* to book a new time.`,
    },
    COMPLETED: {
      kind: "APPOINTMENT_COMPLETED",
      body: `Thank you for visiting ${by}. Wishing you a quick recovery! 🌿\n\nReply *3* to see any follow-ups.`,
    },
  };
  const message = messages[appointment.status];
  if (!message) return;
  await sendWhatsAppText(appointment.patient.phone, message.body, {
    doctorId,
    kind: message.kind,
    appointmentId: appointment.id,
    allowTemplateFallback: true,
  });
}

export async function notifyRescheduled(appointment: Appointment) {
  await sendWhatsAppText(
    appointment.patient.phone,
    `🔁 *Appointment rescheduled*\n\nYour new time is ${when(appointment)} with ${signature(appointment.doctorId)}.\n\nReply *2* to see your appointments.`,
    {
      doctorId: appointment.doctorId,
      kind: "APPOINTMENT_RESCHEDULED",
      appointmentId: appointment.id,
      allowTemplateFallback: true,
    },
  );
}

export async function notifyFollowUpScheduled(followUp: FollowUp) {
  if (!followUp.patient) return;
  const reason = followUp.reason ? `\n📝 ${followUp.reason}` : "";
  await sendWhatsAppText(
    followUp.patient.phone,
    `🩺 *Follow-up scheduled*\n\n${signature(followUp.doctorId)} would like to see you again on ${friendlyDate(followUp.followUpDate)}.${reason}\n\nReply *1* to book a time.`,
    {
      doctorId: followUp.doctorId,
      kind: "FOLLOW_UP_SCHEDULED",
      followUpId: followUp.id,
      allowTemplateFallback: true,
    },
  );
}

/**
 * Whether a message the clinic starts can reach this patient: always in the
 * demo, with an approved template, or within 24 hours of their last message
 * (WhatsApp rejects free text outside that window).
 */
function canReachPatient(doctorId: string, phone: string) {
  const config = getWhatsAppConfig();
  if (config.mode === "simulated" || config.reminderTemplate) return true;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return !!getDatabase()
    .prepare(
      "SELECT 1 FROM whatsapp_messages WHERE doctor_id = ? AND phone = ? AND direction = 'IN' AND created_at >= ? LIMIT 1",
    )
    .get(doctorId, phone, since);
}

/**
 * Confirmation for a booking the doctor made at the desk. Skipped quietly
 * when WhatsApp would refuse it, so nothing fails in the message log.
 */
export async function notifyBookedByClinic(
  appointment: Appointment,
  { walkIn }: { walkIn: boolean },
) {
  const doctorId = appointment.doctorId;
  if (!canReachPatient(doctorId, appointment.patient.phone)) return;
  const by = signature(doctorId);
  const body = walkIn
    ? `✅ *You're checked in* with ${by}.\n\nSave this number: you can book your next visit and get reminders right here. Reply *Hi* any time.`
    : `✅ *Appointment booked*\n\n📅 ${when(appointment)}\n👩‍⚕️ ${by}\n\nPlease arrive 10 minutes early. Reply *4* if you need to cancel.`;
  await sendWhatsAppText(appointment.patient.phone, body, {
    doctorId,
    kind: "APPOINTMENT_CONFIRMED",
    appointmentId: appointment.id,
    allowTemplateFallback: true,
  });
}

export async function notifyWelcome(patient: Patient) {
  const doctor = getDoctorById(patient.doctorId);
  await sendWhatsAppText(
    patient.phone,
    `👋 Hello ${patient.name.split(" ")[0]}, welcome to *${doctor?.clinicName ?? "our clinic"}*!\n\nSave this number: you can book appointments and get reminders right here on WhatsApp. Reply *Hi* to start.`,
    { doctorId: patient.doctorId, kind: "WELCOME", allowTemplateFallback: true },
  );
}

// ─── Reminders ────────────────────────────────────────────────────────────────

type ReminderRow = {
  id: string;
  doctor_id: string;
  phone: string;
  date: string;
  time?: string;
  reason: string | null;
};

/**
 * Sends a reminder for every confirmed appointment and pending follow-up due
 * today (later than now) or tomorrow that has not been reminded yet. Safe to
 * run as often as you like: each item is reminded once.
 */
export async function sendDueReminders(doctorId?: string) {
  const db = getDatabase();
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const scope = doctorId ? "AND a.doctor_id = ?" : "";
  const scopeF = doctorId ? "AND f.doctor_id = ?" : "";
  const args = doctorId ? [today, tomorrow, doctorId] : [today, tomorrow];

  const appointments = (
    db
      .prepare(
        `SELECT a.id, a.doctor_id, p.phone, a.appointment_date AS date, a.appointment_time AS time, a.reason
         FROM appointments a JOIN patients p ON p.id = a.patient_id
         WHERE a.status = 'CONFIRMED' AND a.reminder_sent_at IS NULL
           AND a.appointment_date BETWEEN ? AND ? ${scope}`,
      )
      .all(...args) as ReminderRow[]
  ).filter((row) => !isPastSlot(row.date, row.time!));

  const followUps = db
    .prepare(
      `SELECT f.id, f.doctor_id, p.phone, f.follow_up_date AS date, f.reason
       FROM follow_ups f JOIN patients p ON p.id = f.patient_id
       WHERE f.status = 'PENDING' AND f.reminder_sent_at IS NULL
         AND f.follow_up_date BETWEEN ? AND ? ${scopeF}`,
    )
    .all(...args) as ReminderRow[];

  const markAppointment = db.prepare("UPDATE appointments SET reminder_sent_at = ? WHERE id = ?");
  const markFollowUp = db.prepare("UPDATE follow_ups SET reminder_sent_at = ? WHERE id = ?");
  let sent = 0;
  let failed = 0;

  for (const row of appointments) {
    const day = row.date === today ? "today" : "tomorrow";
    const result = await sendWhatsAppText(
      row.phone,
      `⏰ *Reminder:* your appointment with ${signature(row.doctor_id)} is ${day}, ${friendlyDate(row.date)} at ${friendlyTime(row.time!)}.\n\nReply *4* if you can't make it.`,
      { doctorId: row.doctor_id, kind: "APPOINTMENT_REMINDER", appointmentId: row.id, allowTemplateFallback: true },
    );
    if (result.ok) {
      markAppointment.run(new Date().toISOString(), row.id);
      sent++;
    } else failed++;
  }

  for (const row of followUps) {
    const day = row.date === today ? "today" : "tomorrow";
    const result = await sendWhatsAppText(
      row.phone,
      `⏰ *Follow-up due ${day}* (${friendlyDate(row.date)}) with ${signature(row.doctor_id)}.${row.reason ? `\n📝 ${row.reason}` : ""}\n\nReply *1* to book a time.`,
      { doctorId: row.doctor_id, kind: "FOLLOW_UP_REMINDER", followUpId: row.id, allowTemplateFallback: true },
    );
    if (result.ok) {
      markFollowUp.run(new Date().toISOString(), row.id);
      sent++;
    } else failed++;
  }

  return { sent, failed, appointments: appointments.length, followUps: followUps.length };
}
