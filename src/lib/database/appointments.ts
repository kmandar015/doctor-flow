import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase } from "./db";
import type { Appointment, AppointmentSource, AppointmentStatus, Patient } from "./types";

type AppointmentRow = Omit<Appointment, "patient"> & {
  patient_name: string; patient_phone: string; patient_email: string | null;
  patient_date_of_birth: string | null; patient_gender: string | null;
  patient_created_at: string; patient_updated_at: string;
};

const selectAppointment = `SELECT a.id, a.doctor_id AS doctorId, a.patient_id AS patientId,
  a.appointment_date AS appointmentDate, a.appointment_time AS appointmentTime, a.reason, a.notes,
  a.status, a.source, a.created_at AS createdAt, a.updated_at AS updatedAt,
  p.name AS patient_name, p.phone AS patient_phone, p.email AS patient_email,
  p.date_of_birth AS patient_date_of_birth, p.gender AS patient_gender,
  p.created_at AS patient_created_at, p.updated_at AS patient_updated_at
  FROM appointments a JOIN patients p ON p.id = a.patient_id`;

function toAppointment(row: AppointmentRow): Appointment {
  const patient: Patient = {
    id: row.patientId, name: row.patient_name, phone: row.patient_phone, email: row.patient_email,
    dateOfBirth: row.patient_date_of_birth, gender: row.patient_gender,
    createdAt: row.patient_created_at, updatedAt: row.patient_updated_at,
  };
  return { ...row, patient };
}

export function listAppointments(doctorId: string, filters: { status?: AppointmentStatus; date?: string; from?: string; to?: string } = {}) {
  const clauses = ["a.doctor_id = ?"];
  const values: string[] = [doctorId];
  if (filters.status) { clauses.push("a.status = ?"); values.push(filters.status); }
  if (filters.date) { clauses.push("a.appointment_date = ?"); values.push(filters.date); }
  if (filters.from) { clauses.push("a.appointment_date >= ?"); values.push(filters.from); }
  if (filters.to) { clauses.push("a.appointment_date <= ?"); values.push(filters.to); }
  const rows = getDatabase().prepare(`${selectAppointment} WHERE ${clauses.join(" AND ")} ORDER BY a.appointment_date, a.appointment_time`).all(...values) as AppointmentRow[];
  return rows.map(toAppointment);
}

export function getAppointment(doctorId: string, id: string) {
  const row = getDatabase().prepare(`${selectAppointment} WHERE a.doctor_id = ? AND a.id = ?`).get(doctorId, id) as AppointmentRow | undefined;
  return row ? toAppointment(row) : null;
}

type CreateAppointmentInput = {
  patient: { name: string; phone: string; email?: string; dateOfBirth?: string; gender?: string };
  appointmentDate: string; appointmentTime: string; reason?: string; notes?: string;
  source?: AppointmentSource;
};

export function createAppointment(doctorId: string, input: CreateAppointmentInput) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT id FROM patients WHERE phone = ?").get(input.patient.phone) as { id: string } | undefined;
  const patientId = existing?.id ?? randomUUID();
  if (existing) {
    db.prepare("UPDATE patients SET name = ?, email = COALESCE(?, email), date_of_birth = COALESCE(?, date_of_birth), gender = COALESCE(?, gender), updated_at = ? WHERE id = ?")
      .run(input.patient.name, input.patient.email ?? null, input.patient.dateOfBirth ?? null, input.patient.gender ?? null, now, patientId);
  } else {
    db.prepare("INSERT INTO patients (id, name, phone, email, date_of_birth, gender, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(patientId, input.patient.name, input.patient.phone, input.patient.email ?? null, input.patient.dateOfBirth ?? null, input.patient.gender ?? null, now, now);
  }
  const id = randomUUID();
  db.prepare("INSERT INTO appointments (id, doctor_id, patient_id, appointment_date, appointment_time, reason, notes, status, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)")
    .run(id, doctorId, patientId, input.appointmentDate, input.appointmentTime, input.reason ?? null, input.notes ?? null, input.source ?? "MANUAL", now, now);
  return getAppointment(doctorId, id)!;
}

const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "REJECTED"], CONFIRMED: ["COMPLETED", "CANCELLED"],
  REJECTED: [], COMPLETED: [], CANCELLED: [],
};

export function updateAppointmentStatus(doctorId: string, id: string, nextStatus: AppointmentStatus) {
  const appointment = getAppointment(doctorId, id);
  if (!appointment) return { kind: "not-found" as const };
  if (!validTransitions[appointment.status].includes(nextStatus)) return { kind: "invalid-transition" as const, currentStatus: appointment.status };
  getDatabase().prepare("UPDATE appointments SET status = ?, updated_at = ? WHERE id = ? AND doctor_id = ?")
    .run(nextStatus, new Date().toISOString(), id, doctorId);
  return { kind: "updated" as const, appointment: getAppointment(doctorId, id)! };
}

export function listPatients(doctorId: string) {
  return getDatabase().prepare(`SELECT p.id, p.name, p.phone, p.email, p.date_of_birth AS dateOfBirth, p.gender,
    MAX(a.appointment_date) AS lastVisit, COUNT(a.id) AS visits
    FROM patients p JOIN appointments a ON a.patient_id = p.id WHERE a.doctor_id = ?
    GROUP BY p.id ORDER BY p.name`).all(doctorId) as Array<{ id: string; name: string; phone: string; email: string | null; dateOfBirth: string | null; gender: string | null; lastVisit: string; visits: number }>;
}

export function getDashboardSummary(doctorId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const appointments = listAppointments(doctorId);
  const patients = listPatients(doctorId);
  return {
    appointments,
    patientsCount: patients.length,
    stats: {
      today: appointments.filter((appointment) => appointment.appointmentDate === today).length,
      pending: appointments.filter((appointment) => appointment.status === "PENDING").length,
      completed: appointments.filter((appointment) => appointment.status === "COMPLETED").length,
      total: appointments.length,
    },
  };
}
