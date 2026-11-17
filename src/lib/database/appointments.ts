import "server-only";
import { todayISO } from "@/lib/dates";

import { randomUUID } from "node:crypto";
import { getDatabase } from "./db";
import type {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
  Patient,
} from "./types";
import { checkSlot } from "./availability";

type AppointmentRow = Omit<Appointment, "patient"> & {
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  patient_date_of_birth: string | null;
  patient_gender: string | null;
  patient_address: string | null;
  patient_notes: string | null;
  patient_doctor_id: string;
  patient_created_at: string;
  patient_updated_at: string;
};

const selectAppointment = `SELECT a.id, a.doctor_id AS doctorId, a.patient_id AS patientId,
  a.appointment_date AS appointmentDate, a.appointment_time AS appointmentTime, a.reason, a.notes,
  a.status, a.source, a.created_at AS createdAt, a.updated_at AS updatedAt,
  p.name AS patient_name, p.phone AS patient_phone, p.email AS patient_email,
  p.date_of_birth AS patient_date_of_birth, p.gender AS patient_gender,
  p.address AS patient_address, p.notes AS patient_notes,
  p.doctor_id AS patient_doctor_id,
  p.created_at AS patient_created_at, p.updated_at AS patient_updated_at
  FROM appointments a JOIN patients p ON p.id = a.patient_id`;

function toAppointment(row: AppointmentRow): Appointment {
  const patient: Patient = {
    id: row.patientId,
    doctorId: row.patient_doctor_id,
    name: row.patient_name,
    phone: row.patient_phone,
    email: row.patient_email,
    dateOfBirth: row.patient_date_of_birth,
    gender: row.patient_gender,
    address: row.patient_address,
    notes: row.patient_notes,
    createdAt: row.patient_created_at,
    updatedAt: row.patient_updated_at,
  };
  return { ...row, patient };
}

export function listAppointments(
  doctorId: string,
  filters: {
    status?: AppointmentStatus;
    date?: string;
    from?: string;
    to?: string;
  } = {},
) {
  const clauses = ["a.doctor_id = ?"];
  const values: string[] = [doctorId];
  if (filters.status) {
    clauses.push("a.status = ?");
    values.push(filters.status);
  }
  if (filters.date) {
    clauses.push("a.appointment_date = ?");
    values.push(filters.date);
  }
  if (filters.from) {
    clauses.push("a.appointment_date >= ?");
    values.push(filters.from);
  }
  if (filters.to) {
    clauses.push("a.appointment_date <= ?");
    values.push(filters.to);
  }
  const rows = getDatabase()
    .prepare(
      `${selectAppointment} WHERE ${clauses.join(" AND ")} ORDER BY a.appointment_date, a.appointment_time`,
    )
    .all(...values) as AppointmentRow[];
  return rows.map(toAppointment);
}

export function getAppointment(doctorId: string, id: string) {
  const row = getDatabase()
    .prepare(`${selectAppointment} WHERE a.doctor_id = ? AND a.id = ?`)
    .get(doctorId, id) as AppointmentRow | undefined;
  return row ? toAppointment(row) : null;
}

type CreateAppointmentInput = {
  patient: {
    name: string;
    phone: string;
    email?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    notes?: string;
  };
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
  notes?: string;
  source?: AppointmentSource;
  /** PENDING for patient requests; bookings the doctor makes start CONFIRMED. */
  status?: Extract<AppointmentStatus, "PENDING" | "CONFIRMED">;
  /**
   * A patient at the clinic right now: booked at the current time, outside
   * the slot grid, even during a break or over another booking.
   */
  walkIn?: boolean;
};

export function createAppointment(
  doctorId: string,
  input: CreateAppointmentInput,
) {
  if (!input.walkIn) {
    const slotStatus = checkSlot(
      doctorId,
      input.appointmentDate,
      input.appointmentTime,
    );
    if (slotStatus !== "AVAILABLE") {
      throw new Error(slotStatus);
    }
    if (hasConflict(doctorId, input.appointmentDate, input.appointmentTime)) {
      throw new Error("CONFLICT");
    }
  }
  const db = getDatabase();
  const now = new Date().toISOString();
  // Scope patient lookup by doctor_id to prevent cross-doctor leakage
  const existing = db
    .prepare("SELECT id FROM patients WHERE phone = ? AND doctor_id = ?")
    .get(input.patient.phone, doctorId) as { id: string } | undefined;
  const patientId = existing?.id ?? randomUUID();
  if (existing) {
    db.prepare(
      "UPDATE patients SET name = ?, email = COALESCE(?, email), date_of_birth = COALESCE(?, date_of_birth), gender = COALESCE(?, gender), updated_at = ? WHERE id = ? AND doctor_id = ?",
    ).run(
      input.patient.name,
      input.patient.email ?? null,
      input.patient.dateOfBirth ?? null,
      input.patient.gender ?? null,
      now,
      patientId,
      doctorId,
    );
  } else {
    db.prepare(
      "INSERT INTO patients (id, doctor_id, name, phone, email, date_of_birth, gender, address, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      patientId,
      doctorId,
      input.patient.name,
      input.patient.phone,
      input.patient.email ?? null,
      input.patient.dateOfBirth ?? null,
      input.patient.gender ?? null,
      input.patient.address ?? null,
      input.patient.notes ?? null,
      now,
      now,
    );
  }
  const id = randomUUID();
  db.prepare(
    "INSERT INTO appointments (id, doctor_id, patient_id, appointment_date, appointment_time, reason, notes, status, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    doctorId,
    patientId,
    input.appointmentDate,
    input.appointmentTime,
    input.reason ?? null,
    input.notes ?? null,
    input.status ?? "PENDING",
    input.source ?? "MANUAL",
    now,
    now,
  );
  return getAppointment(doctorId, id)!;
}

const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};

export function updateAppointmentStatus(
  doctorId: string,
  id: string,
  nextStatus: AppointmentStatus,
) {
  const appointment = getAppointment(doctorId, id);
  if (!appointment) return { kind: "not-found" as const };
  if (!validTransitions[appointment.status].includes(nextStatus))
    return {
      kind: "invalid-transition" as const,
      currentStatus: appointment.status,
    };
  getDatabase()
    .prepare(
      "UPDATE appointments SET status = ?, updated_at = ? WHERE id = ? AND doctor_id = ?",
    )
    .run(nextStatus, new Date().toISOString(), id, doctorId);
  return {
    kind: "updated" as const,
    appointment: getAppointment(doctorId, id)!,
  };
}

/**
 * Active appointments on `date` within `minutes` of `time`, other than
 * `excludeId`. Used to warn when a walk-in lands on someone's slot.
 */
export function findNearbyAppointments(
  doctorId: string,
  date: string,
  time: string,
  minutes: number,
  excludeId?: string,
) {
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const at = toMinutes(time);
  const rows = getDatabase()
    .prepare(
      `SELECT a.id, a.appointment_time AS time, p.name AS name FROM appointments a
       JOIN patients p ON p.id = a.patient_id AND p.doctor_id = a.doctor_id
       WHERE a.doctor_id = ? AND a.appointment_date = ? AND a.status IN ('PENDING', 'CONFIRMED')
       ORDER BY a.appointment_time`,
    )
    .all(doctorId, date) as Array<{ id: string; time: string; name: string }>;
  return rows
    .filter((row) => row.id !== excludeId && Math.abs(toMinutes(row.time) - at) < minutes)
    .map(({ time: t, name }) => ({ time: t, name }));
}

export function hasConflict(
  doctorId: string,
  date: string,
  time: string,
  excludeId?: string,
) {
  let query =
    "SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status NOT IN ('CANCELLED', 'REJECTED')";
  const params = [doctorId, date, time];
  if (excludeId) {
    query += " AND id != ?";
    params.push(excludeId);
  }
  const conflict = getDatabase()
    .prepare(query)
    .get(...params);
  return !!conflict;
}

export function rescheduleAppointment(
  doctorId: string,
  id: string,
  appointmentDate: string,
  appointmentTime: string,
) {
  const appointment = getAppointment(doctorId, id);
  if (!appointment) return { kind: "not-found" as const };

  const slotStatus = checkSlot(doctorId, appointmentDate, appointmentTime);
  if (slotStatus !== "AVAILABLE") {
    return { kind: slotStatus };
  }

  if (hasConflict(doctorId, appointmentDate, appointmentTime, id)) {
    return { kind: "conflict" as const };
  }

  getDatabase()
    .prepare(
      "UPDATE appointments SET appointment_date = ?, appointment_time = ?, reminder_sent_at = NULL, updated_at = ? WHERE id = ? AND doctor_id = ?",
    )
    .run(
      appointmentDate,
      appointmentTime,
      new Date().toISOString(),
      id,
      doctorId,
    );

  return {
    kind: "updated" as const,
    appointment: getAppointment(doctorId, id)!,
  };
}

export function getDashboardSummary(doctorId: string) {
  const today = todayISO();
  const appointments = listAppointments(doctorId);
  // Count every patient record, including walk-ins with no appointments yet.
  const { count: patientsCount } = getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM patients WHERE doctor_id = ?")
    .get(doctorId) as { count: number };
  return {
    appointments,
    patientsCount,
    stats: {
      today: appointments.filter(
        (appointment) => appointment.appointmentDate === today,
      ).length,
      pending: appointments.filter(
        (appointment) => appointment.status === "PENDING",
      ).length,
      completed: appointments.filter(
        (appointment) => appointment.status === "COMPLETED",
      ).length,
      total: appointments.length,
    },
  };
}
