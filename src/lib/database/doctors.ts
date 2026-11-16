import "server-only";

import { getDatabase } from "./db";
import type { Doctor } from "./types";

type DoctorRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  clinic_name: string;
  password_hash: string | null;
};

function toDoctor(row: DoctorRow): Doctor {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    specialization: row.specialization,
    clinicName: row.clinic_name,
  };
}

export function getDoctorById(id: string): Doctor | null {
  const row = getDatabase()
    .prepare("SELECT * FROM doctors WHERE id = ?")
    .get(id) as DoctorRow | undefined;
  return row ? toDoctor(row) : null;
}

/** For sign-in only: includes the password hash. */
export function getDoctorCredentialsByEmail(email: string) {
  const row = getDatabase()
    .prepare("SELECT * FROM doctors WHERE lower(email) = lower(?)")
    .get(email) as DoctorRow | undefined;
  return row ? { doctor: toDoctor(row), passwordHash: row.password_hash } : null;
}

export type UpdateDoctorInput = {
  name: string;
  phone: string;
  specialization: string;
  clinicName: string;
};

export function updateDoctorProfile(id: string, input: UpdateDoctorInput) {
  getDatabase()
    .prepare(
      `UPDATE doctors SET name = ?, phone = ?, specialization = ?, clinic_name = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.name,
      input.phone,
      input.specialization,
      input.clinicName,
      new Date().toISOString(),
      id,
    );
  return getDoctorById(id);
}

/** "Dr. Meera Shah" -> "MS" (skips the "Dr." title). */
export function doctorInitials(name: string) {
  return name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
