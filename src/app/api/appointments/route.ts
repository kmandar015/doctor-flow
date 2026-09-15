import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { createAppointment, listAppointments } from "@/lib/database/appointments";
import { appointmentSources, appointmentStatuses, type AppointmentSource, type AppointmentStatus } from "@/lib/database/types";

export const runtime = "nodejs";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if ((status && !appointmentStatuses.includes(status as AppointmentStatus)) || [date, from, to].some((value) => value && !datePattern.test(value))) {
    return NextResponse.json({ error: "Invalid appointment filter." }, { status: 400 });
  }
  return NextResponse.json({ appointments: listAppointments(getCurrentDoctorId(), { status: status as AppointmentStatus | undefined, date: date ?? undefined, from: from ?? undefined, to: to ?? undefined }) });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid appointment request." }, { status: 400 });
  const input = body as { patient?: { name?: unknown; phone?: unknown; email?: unknown; dateOfBirth?: unknown; gender?: unknown }; appointmentDate?: unknown; appointmentTime?: unknown; reason?: unknown; notes?: unknown; source?: unknown };
  const patient = input.patient;
  if (!patient || typeof patient.name !== "string" || !patient.name.trim() || typeof patient.phone !== "string" || !patient.phone.trim() || typeof input.appointmentDate !== "string" || !datePattern.test(input.appointmentDate) || typeof input.appointmentTime !== "string" || !timePattern.test(input.appointmentTime) || (input.source && (!appointmentSources.includes(input.source as AppointmentSource)))) {
    return NextResponse.json({ error: "Patient name, phone, a valid date, and a valid time are required." }, { status: 400 });
  }
  const text = (value: unknown) => typeof value === "string" ? value.trim() || undefined : undefined;
  const appointment = createAppointment(getCurrentDoctorId(), {
    patient: { name: patient.name.trim(), phone: patient.phone.trim(), email: text(patient.email), dateOfBirth: text(patient.dateOfBirth), gender: text(patient.gender) },
    appointmentDate: input.appointmentDate, appointmentTime: input.appointmentTime, reason: text(input.reason), notes: text(input.notes), source: input.source as AppointmentSource | undefined,
  });
  return NextResponse.json({ appointment }, { status: 201 });
}
