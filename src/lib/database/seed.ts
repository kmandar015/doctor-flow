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

  // [id, doctor_id, name, phone, email, date_of_birth, gender, address, notes]
  const patients: [
    string,
    string,
    string,
    string,
    string | null,
    string | null,
    string | null,
    string | null,
    string | null,
  ][] = [
    [
      "patient-aarav-mehta",
      "doctor-meera-shah",
      "Aarav Mehta",
      "+91 98765 42618",
      "aarav.mehta@example.test",
      "1984-04-12",
      "Male",
      null,
      null,
    ],
    [
      "patient-neha-kulkarni",
      "doctor-meera-shah",
      "Neha Kulkarni",
      "+91 98224 18490",
      "neha.kulkarni@example.test",
      "1995-08-21",
      "Female",
      null,
      null,
    ],
    [
      "patient-vikram-singh",
      "doctor-meera-shah",
      "Vikram Singh",
      "+91 98111 84731",
      null,
      "1973-10-03",
      "Male",
      null,
      null,
    ],
    [
      "patient-priya-patil",
      "doctor-meera-shah",
      "Priya Patil",
      "+91 97642 99103",
      "priya.patil@example.test",
      "1997-02-15",
      "Female",
      null,
      null,
    ],
    [
      "patient-rahul-sharma",
      "doctor-meera-shah",
      "Rahul Sharma",
      "+91 99812 32167",
      null,
      "1992-11-09",
      "Male",
      null,
      null,
    ],
    [
      "patient-sunita-desai",
      "doctor-meera-shah",
      "Sunita Desai",
      "+91 96543 21987",
      null,
      "1961-03-28",
      "Female",
      "42 Shivaji Nagar, Pune",
      "Diabetic, regular checkups needed",
    ],
  ];

  const insertPatient = db.prepare(`INSERT INTO patients
    (id, doctor_id, name, phone, email, date_of_birth, gender, address, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
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

  const followUps = [
    [
      "followup-vikram-today",
      "patient-vikram-singh",
      "appointment-vikram-completed",
      isoDate(0),
      "Check BP after new medication",
      null,
      "PENDING",
      null,
    ],
    [
      "followup-aarav-upcoming",
      "patient-aarav-mehta",
      "appointment-aarav-confirmed",
      isoDate(5),
      "Routine 5-day check",
      "Patient requested afternoon if possible",
      "PENDING",
      null,
    ],
    [
      "followup-sunita-overdue",
      "patient-sunita-desai",
      null,
      isoDate(-2),
      "Monthly diabetes review",
      null,
      "PENDING",
      null,
    ],
    [
      "followup-neha-completed",
      "patient-neha-kulkarni",
      null,
      isoDate(-5),
      "Skin reaction check",
      null,
      "COMPLETED",
      now,
    ],
    [
      "followup-priya-cancelled",
      "patient-priya-patil",
      null,
      isoDate(1),
      "Review after treatment",
      null,
      "CANCELLED",
      null,
    ],
  ];

  const insertFollowUp = db.prepare(`INSERT INTO follow_ups
    (id, doctor_id, patient_id, appointment_id, follow_up_date, reason, notes, status, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const f of followUps) {
    insertFollowUp.run(f[0], "doctor-meera-shah", ...f.slice(1), now, now);
  }
}
