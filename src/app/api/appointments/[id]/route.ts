import { NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { getAppointment } from "@/lib/database/appointments";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const appointment = getAppointment(getCurrentDoctorId(), (await params).id);
  return appointment
    ? NextResponse.json({ appointment })
    : NextResponse.json({ error: "Appointment not found." }, { status: 404 });
}
