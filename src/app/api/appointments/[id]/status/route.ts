import { NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { updateAppointmentStatus } from "@/lib/database/appointments";
import { appointmentStatuses, type AppointmentStatus } from "@/lib/database/types";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let body: { status?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (typeof body.status !== "string" || !appointmentStatuses.includes(body.status as AppointmentStatus)) return NextResponse.json({ error: "Invalid appointment status." }, { status: 400 });
  const result = updateAppointmentStatus(getCurrentDoctorId(), (await params).id, body.status as AppointmentStatus);
  if (result.kind === "not-found") return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  if (result.kind === "invalid-transition") return NextResponse.json({ error: `Cannot change ${result.currentStatus} to ${body.status}.` }, { status: 409 });
  return NextResponse.json({ appointment: result.appointment });
}
