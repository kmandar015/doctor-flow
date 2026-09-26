import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import {
  listPatientsWithStats,
  createPatient,
} from "@/lib/database/patients";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dobPattern = /^\d{4}-\d{2}-\d{2}$/;
const validGenders = ["Male", "Female", "Other"] as const;
type Gender = (typeof validGenders)[number];

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const doctorId = getCurrentDoctorId();
  const patients = listPatientsWithStats(doctorId, search);
  return NextResponse.json({ patients });
}

export async function POST(request: NextRequest) {
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

  const input = body as Record<string, unknown>;

  // Validate required fields
  if (
    typeof input.firstName !== "string" ||
    !input.firstName.trim() ||
    input.firstName.trim().length > 100
  ) {
    return NextResponse.json(
      { error: "First name is required and must be at most 100 characters." },
      { status: 400 },
    );
  }
  if (
    typeof input.lastName !== "string" ||
    !input.lastName.trim() ||
    input.lastName.trim().length > 100
  ) {
    return NextResponse.json(
      { error: "Last name is required and must be at most 100 characters." },
      { status: 400 },
    );
  }
  if (typeof input.phone !== "string" || !input.phone.trim()) {
    return NextResponse.json(
      { error: "Phone number is required." },
      { status: 400 },
    );
  }

  // Optional field validation
  if (
    input.email !== undefined &&
    input.email !== null &&
    input.email !== "" &&
    (typeof input.email !== "string" || !emailPattern.test(input.email))
  ) {
    return NextResponse.json(
      { error: "Invalid email address." },
      { status: 400 },
    );
  }

  if (
    input.dateOfBirth !== undefined &&
    input.dateOfBirth !== null &&
    input.dateOfBirth !== ""
  ) {
    if (
      typeof input.dateOfBirth !== "string" ||
      !dobPattern.test(input.dateOfBirth)
    ) {
      return NextResponse.json(
        { error: "Date of birth must be in YYYY-MM-DD format." },
        { status: 400 },
      );
    }
    const dob = new Date(input.dateOfBirth);
    const now = new Date();
    if (dob > now) {
      return NextResponse.json(
        { error: "Date of birth cannot be in the future." },
        { status: 400 },
      );
    }
    const hundredYearsAgo = new Date();
    hundredYearsAgo.setFullYear(hundredYearsAgo.getFullYear() - 130);
    if (dob < hundredYearsAgo) {
      return NextResponse.json(
        { error: "Date of birth is implausibly old." },
        { status: 400 },
      );
    }
  }

  if (
    input.gender !== undefined &&
    input.gender !== null &&
    input.gender !== "" &&
    !validGenders.includes(input.gender as Gender)
  ) {
    return NextResponse.json(
      { error: "Gender must be Male, Female, or Other." },
      { status: 400 },
    );
  }

  if (
    input.address !== undefined &&
    input.address !== null &&
    typeof input.address === "string" &&
    input.address.length > 500
  ) {
    return NextResponse.json(
      { error: "Address must be at most 500 characters." },
      { status: 400 },
    );
  }

  if (
    input.notes !== undefined &&
    input.notes !== null &&
    typeof input.notes === "string" &&
    input.notes.length > 1000
  ) {
    return NextResponse.json(
      { error: "Notes must be at most 1000 characters." },
      { status: 400 },
    );
  }

  const firstName = (input.firstName as string).trim();
  const lastName = (input.lastName as string).trim();
  const name = `${firstName} ${lastName}`;
  const phone = (input.phone as string).trim();

  const text = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;

  const doctorId = getCurrentDoctorId();

  try {
    const patient = createPatient(doctorId, {
      name,
      phone,
      email: text(input.email),
      dateOfBirth: text(input.dateOfBirth),
      gender: text(input.gender),
      address: text(input.address),
      notes: text(input.notes),
    });
    // Return as PatientWithStats shape (no appointments yet)
    return NextResponse.json(
      {
        patient: {
          ...patient,
          totalAppointments: 0,
          lastAppointment: null,
          nextAppointment: null,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "DUPLICATE_PHONE") {
      return NextResponse.json(
        {
          error:
            "A patient with this phone number is already registered.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
