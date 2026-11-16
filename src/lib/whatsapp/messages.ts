import "server-only";

import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/database/db";

export type MessageDirection = "IN" | "OUT";
export type MessageStatus = "RECEIVED" | "SENT" | "FAILED" | "SIMULATED";

/** What a message was about; shown as a label in the dashboard. */
export type MessageKind =
  | "PATIENT"
  | "BOT_REPLY"
  | "BOOKING_REQUESTED"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_REJECTED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_RESCHEDULED"
  | "APPOINTMENT_COMPLETED"
  | "APPOINTMENT_REMINDER"
  | "FOLLOW_UP_SCHEDULED"
  | "FOLLOW_UP_REMINDER"
  | "WELCOME";

export type WhatsAppMessage = {
  id: string;
  doctorId: string;
  patientId: string | null;
  patientName: string | null;
  phone: string;
  direction: MessageDirection;
  kind: MessageKind;
  body: string;
  status: MessageStatus;
  error: string | null;
  appointmentId: string | null;
  followUpId: string | null;
  createdAt: string;
};

const selectMessage = `SELECT m.id, m.doctor_id AS doctorId, m.patient_id AS patientId,
  p.name AS patientName, m.phone, m.direction, m.kind, m.body, m.status, m.error,
  m.appointment_id AS appointmentId, m.follow_up_id AS followUpId, m.created_at AS createdAt
  FROM whatsapp_messages m LEFT JOIN patients p ON p.id = m.patient_id`;

export function findPatientIdByPhone(doctorId: string, phone: string) {
  const row = getDatabase()
    .prepare("SELECT id FROM patients WHERE doctor_id = ? AND phone = ?")
    .get(doctorId, phone) as { id: string } | undefined;
  return row?.id ?? null;
}

export function logMessage(input: {
  doctorId: string;
  phone: string;
  direction: MessageDirection;
  kind: MessageKind;
  body: string;
  status: MessageStatus;
  providerMessageId?: string | null;
  error?: string | null;
  appointmentId?: string | null;
  followUpId?: string | null;
}) {
  const id = randomUUID();
  getDatabase()
    .prepare(
      `INSERT INTO whatsapp_messages (id, doctor_id, patient_id, phone, direction, kind, body, status,
        provider_message_id, error, appointment_id, follow_up_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.doctorId,
      findPatientIdByPhone(input.doctorId, input.phone),
      input.phone,
      input.direction,
      input.kind,
      input.body,
      input.status,
      input.providerMessageId ?? null,
      input.error ?? null,
      input.appointmentId ?? null,
      input.followUpId ?? null,
      new Date().toISOString(),
    );
  return id;
}

/** True when Meta already delivered this message to us (webhooks retry). */
export function isDuplicateIncoming(providerMessageId: string) {
  return !!getDatabase()
    .prepare("SELECT 1 FROM whatsapp_messages WHERE provider_message_id = ?")
    .get(providerMessageId);
}

/** Links earlier messages from a number to the patient record created later. */
export function attachMessagesToPatient(doctorId: string, phone: string) {
  const patientId = findPatientIdByPhone(doctorId, phone);
  if (!patientId) return;
  getDatabase()
    .prepare(
      "UPDATE whatsapp_messages SET patient_id = ? WHERE doctor_id = ? AND phone = ? AND patient_id IS NULL",
    )
    .run(patientId, doctorId, phone);
}

export function listMessagesForPhone(doctorId: string, phone: string) {
  return getDatabase()
    .prepare(
      `${selectMessage} WHERE m.doctor_id = ? AND m.phone = ? ORDER BY m.created_at, m.rowid`,
    )
    .all(doctorId, phone)
    .map((row) => ({ ...(row as WhatsAppMessage) }));
}

export function listMessagesForPatient(doctorId: string, patientId: string) {
  return getDatabase()
    .prepare(
      `${selectMessage} WHERE m.doctor_id = ? AND m.patient_id = ? ORDER BY m.created_at, m.rowid`,
    )
    .all(doctorId, patientId)
    .map((row) => ({ ...(row as WhatsAppMessage) }));
}

export type Conversation = {
  phone: string;
  patientId: string | null;
  patientName: string | null;
  lastBody: string;
  lastDirection: MessageDirection;
  lastAt: string;
  messageCount: number;
};

/** One row per phone number, newest conversation first. */
export function listConversations(doctorId: string): Conversation[] {
  return getDatabase()
    .prepare(
      `SELECT m.phone, MAX(m.patient_id) AS patientId, MAX(p.name) AS patientName,
         (SELECT body FROM whatsapp_messages x WHERE x.doctor_id = m.doctor_id AND x.phone = m.phone ORDER BY x.created_at DESC, x.rowid DESC LIMIT 1) AS lastBody,
         (SELECT direction FROM whatsapp_messages x WHERE x.doctor_id = m.doctor_id AND x.phone = m.phone ORDER BY x.created_at DESC, x.rowid DESC LIMIT 1) AS lastDirection,
         MAX(m.created_at) AS lastAt, COUNT(*) AS messageCount
       FROM whatsapp_messages m LEFT JOIN patients p ON p.id = m.patient_id
       WHERE m.doctor_id = ?
       GROUP BY m.phone
       ORDER BY lastAt DESC`,
    )
    .all(doctorId)
    .map((row) => ({ ...(row as Conversation) }));
}
