import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase } from "./db";
import type { FollowUp, FollowUpStatus, Patient } from "./types";

type FollowUpRow = Omit<FollowUp, "patient"> & {
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

const selectFollowUp = `SELECT f.id, f.doctor_id AS doctorId, f.patient_id AS patientId,
  f.appointment_id AS appointmentId, f.follow_up_date AS followUpDate, f.reason, f.notes,
  f.status, f.completed_at AS completedAt, f.created_at AS createdAt, f.updated_at AS updatedAt,
  p.name AS patient_name, p.phone AS patient_phone, p.email AS patient_email,
  p.date_of_birth AS patient_date_of_birth, p.gender AS patient_gender,
  p.address AS patient_address, p.notes AS patient_notes,
  p.doctor_id AS patient_doctor_id,
  p.created_at AS patient_created_at, p.updated_at AS patient_updated_at
  FROM follow_ups f JOIN patients p ON p.id = f.patient_id`;

function toFollowUp(row: FollowUpRow): FollowUp {
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

export function listFollowUps(
  doctorId: string,
  filters: {
    status?: FollowUpStatus;
    filter?: "today" | "upcoming" | "overdue" | "completed" | "all";
  } = {},
) {
  const clauses = ["f.doctor_id = ?"];
  const values: string[] = [doctorId];
  const today = new Date().toISOString().slice(0, 10);

  if (filters.status) {
    clauses.push("f.status = ?");
    values.push(filters.status);
  }

  if (filters.filter) {
    switch (filters.filter) {
      case "today":
        clauses.push("f.follow_up_date = ?");
        values.push(today);
        break;
      case "upcoming":
        clauses.push("f.follow_up_date > ? AND f.status = 'PENDING'");
        values.push(today);
        break;
      case "overdue":
        clauses.push("f.follow_up_date < ? AND f.status = 'PENDING'");
        values.push(today);
        break;
      case "completed":
        clauses.push("f.status = 'COMPLETED'");
        break;
      case "all":
        break;
    }
  }

  const rows = getDatabase()
    .prepare(
      `${selectFollowUp} WHERE ${clauses.join(" AND ")} ORDER BY f.follow_up_date ASC`,
    )
    .all(...values) as FollowUpRow[];
  return rows.map(toFollowUp);
}

export function getFollowUpById(doctorId: string, id: string) {
  const row = getDatabase()
    .prepare(`${selectFollowUp} WHERE f.doctor_id = ? AND f.id = ?`)
    .get(doctorId, id) as FollowUpRow | undefined;
  return row ? toFollowUp(row) : null;
}

export function getPatientFollowUps(doctorId: string, patientId: string) {
  const rows = getDatabase()
    .prepare(
      `${selectFollowUp} WHERE f.doctor_id = ? AND f.patient_id = ? ORDER BY f.follow_up_date DESC`,
    )
    .all(doctorId, patientId) as FollowUpRow[];
  return rows.map(toFollowUp);
}

type CreateFollowUpInput = {
  patientId: string;
  appointmentId?: string;
  followUpDate: string;
  reason?: string;
  notes?: string;
};

export function createFollowUp(doctorId: string, input: CreateFollowUpInput) {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Validate patient exists and belongs to doctor
  const patient = db
    .prepare("SELECT id FROM patients WHERE id = ? AND doctor_id = ?")
    .get(input.patientId, doctorId);
  if (!patient) {
    throw new Error("Patient not found or unauthorized");
  }

  // Validate appointment if supplied
  if (input.appointmentId) {
    const appointment = db
      .prepare(
        "SELECT id FROM appointments WHERE id = ? AND patient_id = ? AND doctor_id = ?",
      )
      .get(input.appointmentId, input.patientId, doctorId);
    if (!appointment) {
      throw new Error("Appointment not found or unauthorized");
    }
  }

  const id = randomUUID();
  db.prepare(
    "INSERT INTO follow_ups (id, doctor_id, patient_id, appointment_id, follow_up_date, reason, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)",
  ).run(
    id,
    doctorId,
    input.patientId,
    input.appointmentId ?? null,
    input.followUpDate,
    input.reason ?? null,
    input.notes ?? null,
    now,
    now,
  );
  return getFollowUpById(doctorId, id)!;
}

export function completeFollowUp(doctorId: string, id: string) {
  const followUp = getFollowUpById(doctorId, id);
  if (!followUp) return { kind: "not-found" as const };
  if (followUp.status !== "PENDING") {
    return {
      kind: "invalid-transition" as const,
      currentStatus: followUp.status,
    };
  }
  const now = new Date().toISOString();
  getDatabase()
    .prepare(
      "UPDATE follow_ups SET status = 'COMPLETED', completed_at = ?, updated_at = ? WHERE id = ? AND doctor_id = ?",
    )
    .run(now, now, id, doctorId);
  return {
    kind: "updated" as const,
    followUp: getFollowUpById(doctorId, id)!,
  };
}

export function cancelFollowUp(doctorId: string, id: string) {
  const followUp = getFollowUpById(doctorId, id);
  if (!followUp) return { kind: "not-found" as const };
  if (followUp.status !== "PENDING") {
    return {
      kind: "invalid-transition" as const,
      currentStatus: followUp.status,
    };
  }
  getDatabase()
    .prepare(
      "UPDATE follow_ups SET status = 'CANCELLED', updated_at = ? WHERE id = ? AND doctor_id = ?",
    )
    .run(new Date().toISOString(), id, doctorId);
  return {
    kind: "updated" as const,
    followUp: getFollowUpById(doctorId, id)!,
  };
}

export function updateFollowUp(
  doctorId: string,
  id: string,
  data: Partial<CreateFollowUpInput>,
) {
  const followUp = getFollowUpById(doctorId, id);
  if (!followUp) return { kind: "not-found" as const };

  const db = getDatabase();
  const now = new Date().toISOString();

  if (data.patientId && data.patientId !== followUp.patientId) {
    const patient = db
      .prepare("SELECT id FROM patients WHERE id = ? AND doctor_id = ?")
      .get(data.patientId, doctorId);
    if (!patient) {
      throw new Error("Patient not found or unauthorized");
    }
  }

  db.prepare(
    "UPDATE follow_ups SET follow_up_date = COALESCE(?, follow_up_date), reason = COALESCE(?, reason), notes = COALESCE(?, notes), updated_at = ? WHERE id = ? AND doctor_id = ?",
  ).run(
    data.followUpDate ?? followUp.followUpDate,
    data.reason !== undefined ? data.reason : followUp.reason,
    data.notes !== undefined ? data.notes : followUp.notes,
    now,
    id,
    doctorId,
  );
  return {
    kind: "updated" as const,
    followUp: getFollowUpById(doctorId, id)!,
  };
}
