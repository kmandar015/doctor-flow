import "server-only";
import { NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { getPatientById, updatePatient, listPatientsWithStats } from "@/lib/database/patients";

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
  // Return with stats
  const withStats = listPatientsWithStats(doctorId).find((p) => p.id === id);
  if (!withStats) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }
  return NextResponse.json({ patient: withStats });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const doctorId = getCurrentDoctorId();
  const input = body as Record<string, unknown>;

  const text = (v: unknown) =>
    typeof v === "string" ? v.trim() : undefined;

  const updateInput: Parameters<typeof updatePatient>[2] = {};
  if ("name" in input) updateInput.name = text(input.name);
  if ("email" in input) updateInput.email = text(input.email) ?? "";
  if ("dateOfBirth" in input)
    updateInput.dateOfBirth = text(input.dateOfBirth) ?? "";
  if ("gender" in input) updateInput.gender = text(input.gender) ?? "";
  if ("address" in input) updateInput.address = text(input.address) ?? "";
  if ("notes" in input) updateInput.notes = text(input.notes) ?? "";

  const patient = updatePatient(doctorId, id, updateInput);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }
  return NextResponse.json({ patient });
}
