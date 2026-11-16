import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedDevelopmentDatabase } from "./seed";
import { hashPassword } from "@/lib/auth/password";
import { normalizePhone } from "@/lib/phone";

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

  // ── Day 9: login, WhatsApp and reminders ──────────────────────────────────
  addColumnIfMissing(db, "doctors", "password_hash", "TEXT");
  addColumnIfMissing(db, "appointments", "reminder_sent_at", "TEXT");
  addColumnIfMissing(db, "follow_ups", "reminder_sent_at", "TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      doctor_id TEXT NOT NULL REFERENCES doctors(id),
      phone TEXT NOT NULL,
      step TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL,
      PRIMARY KEY (doctor_id, phone)
    );
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL REFERENCES doctors(id),
      patient_id TEXT REFERENCES patients(id),
      phone TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('IN','OUT')),
      kind TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('RECEIVED','SENT','FAILED','SIMULATED')),
      provider_message_id TEXT,
      error TEXT,
      appointment_id TEXT REFERENCES appointments(id),
      follow_up_id TEXT REFERENCES follow_ups(id),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS whatsapp_messages_doctor_idx ON whatsapp_messages(doctor_id, created_at);
    CREATE INDEX IF NOT EXISTS whatsapp_messages_phone_idx ON whatsapp_messages(doctor_id, phone);
    CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_provider_idx
      ON whatsapp_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;
  `);
}

function addColumnIfMissing(
  db: DatabaseSync,
  table: string,
  column: string,
  definition: string,
) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/**
 * Stores every patient phone as E.164 (`+919876543210`) so numbers typed in
 * the dashboard match the numbers WhatsApp sends. Runs on every start, but
 * only touches rows that are not normalized yet.
 */
function normalizeStoredPhones(db: DatabaseSync) {
  const rows = db
    .prepare("SELECT id, phone FROM patients WHERE phone NOT GLOB '+[0-9]*' OR phone GLOB '*[^+0-9]*'")
    .all() as Array<{ id: string; phone: string }>;
  const update = db.prepare("UPDATE patients SET phone = ? WHERE id = ?");
  for (const row of rows) {
    const normalized = normalizePhone(row.phone);
    if (!normalized || normalized === row.phone) continue;
    try {
      update.run(normalized, row.id);
    } catch {
      // A normalized duplicate already exists for this doctor; leave as is.
    }
  }
}

/** Gives the demo doctor a password from env so the login screen works. */
function ensureDemoCredentials(db: DatabaseSync) {
  const password = process.env.DOCTORFLOW_DEMO_PASSWORD;
  if (!password) return;
  db.prepare(
    "UPDATE doctors SET password_hash = ? WHERE id = ? AND password_hash IS NULL",
  ).run(hashPassword(password), "doctor-meera-shah");
}

/** SQLite file location; override with DATABASE_PATH (e.g. a mounted volume). */
function databasePath() {
  return (
    process.env.DATABASE_PATH || join(process.cwd(), "data", "doctorflow.sqlite")
  );
}

export function getDatabase() {
  if (database) return database;
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });
  database = new DatabaseSync(path);
  database.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  migrate(database);
  seedDevelopmentDatabase(database);
  normalizeStoredPhones(database);
  ensureDemoCredentials(database);
  return database;
}
