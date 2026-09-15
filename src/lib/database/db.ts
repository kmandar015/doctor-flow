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
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, email TEXT,
      date_of_birth TEXT, gender TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY, doctor_id TEXT NOT NULL REFERENCES doctors(id), patient_id TEXT NOT NULL REFERENCES patients(id),
      appointment_date TEXT NOT NULL, appointment_time TEXT NOT NULL, reason TEXT, notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('PENDING','CONFIRMED','REJECTED','COMPLETED','CANCELLED')),
      source TEXT NOT NULL CHECK(source IN ('WHATSAPP','DASHBOARD','MANUAL')),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS appointments_doctor_id_idx ON appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS appointments_patient_id_idx ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status);
    CREATE INDEX IF NOT EXISTS patients_phone_idx ON patients(phone);
  `);
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
