import "server-only";
import { todayISO } from "@/lib/dates";

import { getDatabase } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppointmentStats = {
  total: number;
  completed: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  /** Completed / (Total − Cancelled) × 100. N/A → 0 */
  completionRate: number;
  /** Cancelled / Total × 100. N/A → 0 */
  cancellationRate: number;
};

export type PatientStats = {
  total: number;
  new: number;
  returning: number;
};

export type FollowUpStats = {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
  /** Current overdue count (status = PENDING AND follow_up_date < today). Always real-time, not range-scoped. */
  overdue: number;
  /** Completed / (Total − Cancelled) × 100. N/A → 0 */
  completionRate: number;
};

export type TrendPoint = {
  date: string;
  count: number;
};

export type ReportResponse = {
  appointments: AppointmentStats;
  patients: PatientStats;
  followUps: FollowUpStats;
  trends: {
    appointments: TrendPoint[];
    newPatients: TrendPoint[];
  };
};

// ─── Appointment Stats ────────────────────────────────────────────────────────

export function getAppointmentStats(
  doctorId: string,
  from: string,
  to: string,
): AppointmentStats {
  const row = getDatabase()
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled
      FROM appointments
      WHERE doctor_id = ? AND appointment_date >= ? AND appointment_date <= ?`,
    )
    .get(doctorId, from, to) as {
    total: number;
    completed: number;
    confirmed: number;
    pending: number;
    cancelled: number;
  };

  const nonCancelled = row.total - row.cancelled;
  return {
    total: row.total,
    completed: row.completed,
    confirmed: row.confirmed,
    pending: row.pending,
    cancelled: row.cancelled,
    completionRate:
      nonCancelled > 0
        ? Math.round((row.completed / nonCancelled) * 100)
        : 0,
    cancellationRate:
      row.total > 0 ? Math.round((row.cancelled / row.total) * 100) : 0,
  };
}

// ─── Patient Stats ────────────────────────────────────────────────────────────

export function getPatientStats(
  doctorId: string,
  from: string,
  to: string,
): PatientStats {
  const db = getDatabase();

  // Total patients for this doctor
  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM patients WHERE doctor_id = ?`)
    .get(doctorId) as { total: number };

  // New patients: created_at falls within the range
  const { newCount } = db
    .prepare(
      `SELECT COUNT(*) AS newCount FROM patients
       WHERE doctor_id = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ?`,
    )
    .get(doctorId, from, to) as { newCount: number };

  // Returning patients: had an appointment in the range AND had at least one
  // appointment before the range start
  const { returningCount } = db
    .prepare(
      `SELECT COUNT(DISTINCT a1.patient_id) AS returningCount
       FROM appointments a1
       WHERE a1.doctor_id = ?
         AND a1.appointment_date >= ? AND a1.appointment_date <= ?
         AND EXISTS (
           SELECT 1 FROM appointments a2
           WHERE a2.doctor_id = a1.doctor_id
             AND a2.patient_id = a1.patient_id
             AND a2.appointment_date < ?
         )`,
    )
    .get(doctorId, from, to, from) as { returningCount: number };

  return { total, new: newCount, returning: returningCount };
}

// ─── Follow-Up Stats ─────────────────────────────────────────────────────────

export function getFollowUpStats(
  doctorId: string,
  from: string,
  to: string,
): FollowUpStats {
  const db = getDatabase();
  const today = todayISO();

  // Range-scoped counts
  const row = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled
      FROM follow_ups
      WHERE doctor_id = ? AND follow_up_date >= ? AND follow_up_date <= ?`,
    )
    .get(doctorId, from, to) as {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
  };

  // Current overdue: not scoped to range – always real-time
  const { overdue } = db
    .prepare(
      `SELECT COUNT(*) AS overdue FROM follow_ups
       WHERE doctor_id = ? AND status = 'PENDING' AND follow_up_date < ?`,
    )
    .get(doctorId, today) as { overdue: number };

  const nonCancelled = row.total - row.cancelled;
  return {
    total: row.total,
    pending: row.pending,
    completed: row.completed,
    cancelled: row.cancelled,
    overdue,
    completionRate:
      nonCancelled > 0
        ? Math.round((row.completed / nonCancelled) * 100)
        : 0,
  };
}

// ─── Appointment Trend ────────────────────────────────────────────────────────

export function getAppointmentTrend(
  doctorId: string,
  from: string,
  to: string,
): TrendPoint[] {
  return getDatabase()
    .prepare(
      `SELECT appointment_date AS date, COUNT(*) AS count
       FROM appointments
       WHERE doctor_id = ? AND appointment_date >= ? AND appointment_date <= ?
       GROUP BY appointment_date
       ORDER BY appointment_date`,
    )
    .all(doctorId, from, to) as TrendPoint[];
}

// ─── Patient Trend ────────────────────────────────────────────────────────────

export function getPatientTrend(
  doctorId: string,
  from: string,
  to: string,
): TrendPoint[] {
  return getDatabase()
    .prepare(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM patients
       WHERE doctor_id = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ?
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at)`,
    )
    .all(doctorId, from, to) as TrendPoint[];
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

export function getReportSummary(
  doctorId: string,
  from: string,
  to: string,
): ReportResponse {
  return {
    appointments: getAppointmentStats(doctorId, from, to),
    patients: getPatientStats(doctorId, from, to),
    followUps: getFollowUpStats(doctorId, from, to),
    trends: {
      appointments: getAppointmentTrend(doctorId, from, to),
      newPatients: getPatientTrend(doctorId, from, to),
    },
  };
}
