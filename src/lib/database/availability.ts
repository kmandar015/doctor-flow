import "server-only";

import { getDatabase } from "./db";
import type { DoctorAvailability } from "./types";

export function getDoctorAvailability(
  doctorId: string,
): DoctorAvailability | null {
  const row = getDatabase()
    .prepare("SELECT * FROM doctor_availability WHERE doctor_id = ?")
    .get(doctorId) as
    | {
        doctor_id: string;
        working_days: string;
        work_start: string;
        work_end: string;
        break_start: string | null;
        break_end: string | null;
        slot_duration: number;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    doctorId: row.doctor_id,
    workingDays: JSON.parse(row.working_days),
    workStart: row.work_start,
    workEnd: row.work_end,
    breakStart: row.break_start,
    breakEnd: row.break_end,
    slotDuration: row.slot_duration,
  };
}

export function upsertDoctorAvailability(availability: DoctorAvailability) {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT doctor_id FROM doctor_availability WHERE doctor_id = ?")
    .get(availability.doctorId);

  if (existing) {
    db.prepare(
      `
      UPDATE doctor_availability 
      SET working_days = ?, work_start = ?, work_end = ?, break_start = ?, break_end = ?, slot_duration = ?
      WHERE doctor_id = ?
    `,
    ).run(
      JSON.stringify(availability.workingDays),
      availability.workStart,
      availability.workEnd,
      availability.breakStart ?? null,
      availability.breakEnd ?? null,
      availability.slotDuration,
      availability.doctorId,
    );
  } else {
    db.prepare(
      `
      INSERT INTO doctor_availability (doctor_id, working_days, work_start, work_end, break_start, break_end, slot_duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      availability.doctorId,
      JSON.stringify(availability.workingDays),
      availability.workStart,
      availability.workEnd,
      availability.breakStart ?? null,
      availability.breakEnd ?? null,
      availability.slotDuration,
    );
  }
}

export function checkSlot(
  doctorId: string,
  date: string,
  time: string,
): "AVAILABLE" | "PAST" | "NON_WORKING_DAY" | "OUTSIDE_HOURS" | "BREAK" {
  const availability = getDoctorAvailability(doctorId);
  if (!availability) return "AVAILABLE"; // Default if not configured

  // Check past
  const now = new Date();
  const slotDate = new Date(`${date}T${time}:00`);
  if (slotDate < now) return "PAST";

  // Check working day
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay(); // 0 = Sunday, 1 = Monday
  if (!availability.workingDays.includes(dayOfWeek)) {
    return "NON_WORKING_DAY";
  }

  // Check working hours
  if (time < availability.workStart || time >= availability.workEnd) {
    return "OUTSIDE_HOURS";
  }

  // Check break
  if (availability.breakStart && availability.breakEnd) {
    if (time >= availability.breakStart && time < availability.breakEnd) {
      return "BREAK";
    }
  }

  return "AVAILABLE";
}
