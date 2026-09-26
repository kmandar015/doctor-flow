import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase } from "./db";
import type { Appointment, AppointmentSource, AppointmentStatus, Patient } from "./types";

// ─── Row types ────────────────────────────────────────────────────────────────

type PatientRow = {
  id: string;
  doctor_id: string;
  name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PatientWithStats = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  notes: string | null;
  totalAppointments: number;
  lastAppointment: string | null;
  nextAppointment: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type AppointmentRow = {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  notes: string | null;
  status: AppointmentStatus;
  source: AppointmentSource;
  created_at: string;
  updated_at: string;
};

function toAppointment(row: AppointmentRow, patient: Patient): Appointment {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    reason: row.reason,
    notes: row.notes,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    patient,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function getPatients(doctorId: string, search?: string): Patient[] {
  const db = getDatabase();
  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`;
    return (
      db
        .prepare(
          `SELECT * FROM patients WHERE doctor_id = ? AND (name LIKE ? OR phone LIKE ?) ORDER BY name`,
        )
        .all(doctorId, pattern, pattern) as PatientRow[]
    ).map(toPatient);
  }
  return (
    db
      .prepare(`SELECT * FROM patients WHERE doctor_id = ? ORDER BY name`)
      .all(doctorId) as PatientRow[]
  ).map(toPatient);
}

export function getPatientById(doctorId: string, id: string): Patient | null {
  const row = getDatabase()
    .prepare("SELECT * FROM patients WHERE id = ? AND doctor_id = ?")
    .get(id, doctorId) as PatientRow | undefined;
  return row ? toPatient(row) : null;
}

export function getPatientByPhone(
  doctorId: string,
  phone: string,
): Patient | null {
  const row = getDatabase()
    .prepare("SELECT * FROM patients WHERE phone = ? AND doctor_id = ?")
    .get(phone, doctorId) as PatientRow | undefined;
  return row ? toPatient(row) : null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export type CreatePatientInput = {
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  notes?: string;
};

export function createPatient(
  doctorId: string,
  input: CreatePatientInput,
): Patient {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT id FROM patients WHERE phone = ? AND doctor_id = ?")
    .get(input.phone, doctorId);
  if (existing) {
    throw new Error("DUPLICATE_PHONE");
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO patients (id, doctor_id, name, phone, email, date_of_birth, gender, address, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    doctorId,
    input.name,
    input.phone,
    input.email ?? null,
    input.dateOfBirth ?? null,
    input.gender ?? null,
    input.address ?? null,
    input.notes ?? null,
    now,
    now,
  );
  return getPatientById(doctorId, id)!;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export type UpdatePatientInput = {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  notes?: string;
};

export function updatePatient(
  doctorId: string,
  id: string,
  input: UpdatePatientInput,
): Patient | null {
  const db = getDatabase();
  const existing = getPatientById(doctorId, id);
  if (!existing) return null;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE patients SET
      name = COALESCE(?, name),
      email = CASE WHEN ? IS NOT NULL THEN ? ELSE email END,
      date_of_birth = CASE WHEN ? IS NOT NULL THEN ? ELSE date_of_birth END,
      gender = CASE WHEN ? IS NOT NULL THEN ? ELSE gender END,
      address = CASE WHEN ? IS NOT NULL THEN ? ELSE address END,
      notes = CASE WHEN ? IS NOT NULL THEN ? ELSE notes END,
      updated_at = ?
    WHERE id = ? AND doctor_id = ?`,
  ).run(
    input.name ?? null,
    input.email !== undefined ? input.email : null,
    input.email !== undefined ? input.email : null,
    input.dateOfBirth !== undefined ? input.dateOfBirth : null,
    input.dateOfBirth !== undefined ? input.dateOfBirth : null,
    input.gender !== undefined ? input.gender : null,
    input.gender !== undefined ? input.gender : null,
    input.address !== undefined ? input.address : null,
    input.address !== undefined ? input.address : null,
    input.notes !== undefined ? input.notes : null,
    input.notes !== undefined ? input.notes : null,
    now,
    id,
    doctorId,
  );
  return getPatientById(doctorId, id);
}

// ─── Patient appointments ─────────────────────────────────────────────────────

export function getPatientAppointments(
  doctorId: string,
  patientId: string,
): Appointment[] {
  const patient = getPatientById(doctorId, patientId);
  if (!patient) return [];
  const rows = getDatabase()
    .prepare(
      `SELECT * FROM appointments
       WHERE doctor_id = ? AND patient_id = ?
       ORDER BY appointment_date DESC, appointment_time DESC`,
    )
    .all(doctorId, patientId) as AppointmentRow[];
  return rows.map((row) => toAppointment(row, patient));
}

// ─── Patients with stats ──────────────────────────────────────────────────────

type PatientWithStatsRow = PatientRow & {
  total_appointments: number;
  last_appointment: string | null;
  next_appointment: string | null;
};

export function listPatientsWithStats(
  doctorId: string,
  search?: string,
): PatientWithStats[] {
  const today = new Date().toISOString().slice(0, 10);
  const searchArg = search && search.trim() ? `%${search.trim()}%` : null;
  const rows = getDatabase()
    .prepare(
      `SELECT p.*,
        COUNT(a.id) AS total_appointments,
        MAX(CASE WHEN a.appointment_date <= ? THEN a.appointment_date END) AS last_appointment,
        MIN(CASE WHEN a.appointment_date > ? AND a.status NOT IN ('CANCELLED', 'REJECTED') THEN a.appointment_date END) AS next_appointment
      FROM patients p
      LEFT JOIN appointments a ON a.patient_id = p.id AND a.doctor_id = p.doctor_id
      WHERE p.doctor_id = ?
        AND (? IS NULL OR p.name LIKE ? OR p.phone LIKE ?)
      GROUP BY p.id
      ORDER BY p.name`,
    )
    .all(
      today,
      today,
      doctorId,
      searchArg,
      searchArg,
      searchArg,
    ) as PatientWithStatsRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    address: row.address,
    notes: row.notes,
    totalAppointments: row.total_appointments,
    lastAppointment: row.last_appointment,
    nextAppointment: row.next_appointment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
