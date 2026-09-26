import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedDevelopmentDatabase } from "./seed";

let database: DatabaseSync | undefined;

function migrate(db: DatabaseSync) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL,
      specialization TEXT NOT NULL, clinic_name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL REFERENCES doctors(id),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      date_of_birth TEXT,
      gender TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY, doctor_id TEXT NOT NULL REFERENCES doctors(id), patient_id TEXT NOT NULL REFERENCES patients(id),
      appointment_date TEXT NOT NULL, appointment_time TEXT NOT NULL, reason TEXT, notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('PENDING','CONFIRMED','REJECTED','COMPLETED','CANCELLED')),
      source TEXT NOT NULL CHECK(source IN ('WHATSAPP','DASHBOARD','MANUAL')),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS doctor_availability (
      doctor_id TEXT PRIMARY KEY REFERENCES doctors(id),
      working_days TEXT NOT NULL,
      work_start TEXT NOT NULL,
      work_end TEXT NOT NULL,
      break_start TEXT,
      break_end TEXT,
      slot_duration INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL REFERENCES doctors(id),
      patient_id TEXT NOT NULL REFERENCES patients(id),
      appointment_id TEXT REFERENCES appointments(id),
      follow_up_date TEXT NOT NULL,
      reason TEXT,
      notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('PENDING','COMPLETED','CANCELLED')),
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS appointments_doctor_id_idx ON appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS appointments_patient_id_idx ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status);
    CREATE INDEX IF NOT EXISTS patients_doctor_id_idx ON patients(doctor_id);
    CREATE INDEX IF NOT EXISTS follow_ups_doctor_id_idx ON follow_ups(doctor_id);
    CREATE INDEX IF NOT EXISTS follow_ups_patient_id_idx ON follow_ups(patient_id);
    CREATE INDEX IF NOT EXISTS follow_ups_date_idx ON follow_ups(follow_up_date);
    CREATE INDEX IF NOT EXISTS follow_ups_status_idx ON follow_ups(status);
  `);

  // Handle migration of existing patients table that may lack new columns
  const cols = db.prepare("PRAGMA table_info(patients)").all() as Array<{
    name: string;
  }>;

  if (!cols.some((c) => c.name === "doctor_id")) {
    db.prepare(
      "ALTER TABLE patients ADD COLUMN doctor_id TEXT REFERENCES doctors(id)",
    ).run();
    db.prepare(
      "UPDATE patients SET doctor_id = 'doctor-meera-shah' WHERE doctor_id IS NULL",
    ).run();
  }
  if (!cols.some((c) => c.name === "address")) {
    db.prepare("ALTER TABLE patients ADD COLUMN address TEXT").run();
  }
  if (!cols.some((c) => c.name === "notes")) {
    db.prepare("ALTER TABLE patients ADD COLUMN notes TEXT").run();
  }

  // Try to create unique index; may fail if duplicates exist (fine in dev)
  try {
    db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS patients_doctor_phone_idx ON patients(doctor_id, phone)",
    );
  } catch {
    // ignore if it fails due to existing duplicates
  }

  // Drop old non-scoped phone uniqueness index if it exists
  try {
    db.exec("DROP INDEX IF EXISTS patients_phone_idx");
  } catch {
    // ignore
  }
}

export function getDatabase() {
  if (database) return database;
  const path = join(process.cwd(), "data", "doctorflow.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  database = new DatabaseSync(path);
  migrate(database);
  seedDevelopmentDatabase(database);
  return database;
}
