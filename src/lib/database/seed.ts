import type { DatabaseSync } from "node:sqlite";

const isoDate = (offsetDays: number) => {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + offsetDays);
  return value.toISOString().slice(0, 10);
};

export function seedDevelopmentDatabase(db: DatabaseSync) {
  const existing = db
    .prepare("SELECT COUNT(*) AS count FROM doctors")
    .get() as { count: number };
  if (existing.count > 0) return;

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO doctors (id, name, email, phone, specialization, clinic_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "doctor-meera-shah",
    "Dr. Meera Shah",
    "meera.shah@doctorflow.test",
    "+91 98765 21098",
    "General Physician",
    "Meera Care Clinic",
    now,
    now,
  );

  const patients = [
    [
      "patient-aarav-mehta",
      "Aarav Mehta",
      "+91 98765 42618",
      "aarav.mehta@example.test",
      "1984-04-12",
      "Male",
    ],
    [
      "patient-neha-kulkarni",
      "Neha Kulkarni",
      "+91 98224 18490",
      "neha.kulkarni@example.test",
      "1995-08-21",
      "Female",
    ],
    [
      "patient-vikram-singh",
      "Vikram Singh",
      "+91 98111 84731",
      null,
      "1973-10-03",
      "Male",
    ],
    [
      "patient-priya-patil",
      "Priya Patil",
      "+91 97642 99103",
      "priya.patil@example.test",
      "1997-02-15",
      "Female",
    ],
    [
      "patient-rahul-sharma",
      "Rahul Sharma",
      "+91 99812 32167",
      null,
      "1992-11-09",
      "Male",
    ],
  ];
  const insertPatient = db.prepare(`INSERT INTO patients
    (id, name, phone, email, date_of_birth, gender, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const patient of patients) insertPatient.run(...patient, now, now);

  const appointments = [
    [
      "appointment-aarav-confirmed",
      "patient-aarav-mehta",
      isoDate(0),
      "10:00",
      "Routine health checkup",
      "CONFIRMED",
      "DASHBOARD",
    ],
    [
      "appointment-neha-confirmed",
      "patient-neha-kulkarni",
      isoDate(0),
      "11:30",
      "Skin consultation",
      "CONFIRMED",
      "MANUAL",
    ],
    [
      "appointment-vikram-completed",
      "patient-vikram-singh",
      isoDate(-1),
      "14:00",
      "Blood pressure review",
      "COMPLETED",
      "DASHBOARD",
    ],
    [
      "appointment-priya-pending",
      "patient-priya-patil",
      isoDate(0),
      "17:30",
      "Follow-up consultation",
      "PENDING",
      "WHATSAPP",
    ],
    [
      "appointment-rahul-pending",
      "patient-rahul-sharma",
      isoDate(0),
      "18:00",
      "General consultation",
      "PENDING",
      "WHATSAPP",
    ],
    [
      "appointment-neha-cancelled",
      "patient-neha-kulkarni",
      isoDate(2),
      "10:30",
      "Follow-up consultation",
      "CANCELLED",
      "DASHBOARD",
    ],
  ];
  const insertAppointment = db.prepare(`INSERT INTO appointments
    (id, doctor_id, patient_id, appointment_date, appointment_time, reason, status, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const appointment of appointments)
    insertAppointment.run(
      appointment[0],
      "doctor-meera-shah",
      ...appointment.slice(1),
      now,
      now,
    );

  db.prepare(
    `INSERT INTO doctor_availability (doctor_id, working_days, work_start, work_end, break_start, break_end, slot_duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "doctor-meera-shah",
    "[1,2,3,4,5]",
    "09:00",
    "17:00",
    "13:00",
    "14:00",
    30,
  );
}
