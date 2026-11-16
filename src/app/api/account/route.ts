import { NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { getDoctorById, updateDoctorProfile } from "@/lib/database/doctors";

export const runtime = "nodejs";

export async function GET() {
  const doctor = getDoctorById(await getCurrentDoctorId());
  return doctor
    ? NextResponse.json({ doctor })
    : NextResponse.json({ error: "Doctor not found." }, { status: 404 });
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const text = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() && value.trim().length <= max
      ? value.trim()
      : null;

  const name = text(body.name, 100);
  const phone = text(body.phone, 30);
  const specialization = text(body.specialization, 100);
  const clinicName = text(body.clinicName, 120);
  if (!name || !phone || !specialization || !clinicName) {
    return NextResponse.json(
      { error: "Name, phone, speciality and clinic name are required." },
      { status: 400 },
    );
  }

  const doctor = updateDoctorProfile(await getCurrentDoctorId(), {
    name,
    phone,
    specialization,
    clinicName,
  });
  return doctor
    ? NextResponse.json({ doctor })
    : NextResponse.json({ error: "Doctor not found." }, { status: 404 });
}
