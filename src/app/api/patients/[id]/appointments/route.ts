import "server-only";
import { NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { getPatientById, getPatientAppointments } from "@/lib/database/patients";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const doctorId = getCurrentDoctorId();
  const patient = getPatientById(doctorId, id);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }
  const appointments = getPatientAppointments(doctorId, id);
  return NextResponse.json({ appointments });
}
