import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import {
  getDoctorAvailability,
  upsertDoctorAvailability,
} from "@/lib/database/availability";
import { DoctorAvailability } from "@/lib/database/types";

export const runtime = "nodejs";

export async function GET() {
  const doctorId = getCurrentDoctorId();
  const availability = getDoctorAvailability(doctorId);

  if (!availability) {
    // Return a default if none configured
    return NextResponse.json({
      availability: {
        doctorId,
        workingDays: [1, 2, 3, 4, 5],
        workStart: "09:00",
        workEnd: "17:00",
        breakStart: null,
        breakEnd: null,
        slotDuration: 30,
      },
    });
  }

  return NextResponse.json({ availability });
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const {
    workingDays,
    workStart,
    workEnd,
    breakStart,
    breakEnd,
    slotDuration,
  } = body as Record<string, unknown>;

  if (
    !Array.isArray(workingDays) ||
    typeof workStart !== "string" ||
    typeof workEnd !== "string" ||
    typeof slotDuration !== "number" ||
    slotDuration <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid availability data." },
      { status: 400 },
    );
  }

  if (workStart >= workEnd) {
    return NextResponse.json(
      { error: "Work start time must be before end time." },
      { status: 400 },
    );
  }

  if (breakStart && breakEnd) {
    if (breakStart >= breakEnd) {
      return NextResponse.json(
        { error: "Break start time must be before end time." },
        { status: 400 },
      );
    }
    if (breakStart < workStart || breakEnd > workEnd) {
      return NextResponse.json(
        { error: "Break must be within working hours." },
        { status: 400 },
      );
    }
  }

  const availability: DoctorAvailability = {
    doctorId: getCurrentDoctorId(),
    workingDays: workingDays as number[],
    workStart: workStart as string,
    workEnd: workEnd as string,
    breakStart: (breakStart as string) || null,
    breakEnd: (breakEnd as string) || null,
    slotDuration: slotDuration as number,
  };

  upsertDoctorAvailability(availability);

  return NextResponse.json({ availability });
}
