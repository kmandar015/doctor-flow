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

import { rescheduleAppointment } from "@/lib/database/appointments";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let body: { appointmentDate?: unknown; appointmentTime?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const { appointmentDate, appointmentTime } = body;

  if (
    typeof appointmentDate !== "string" ||
    !datePattern.test(appointmentDate) ||
    typeof appointmentTime !== "string" ||
    !timePattern.test(appointmentTime)
  ) {
    return NextResponse.json(
      { error: "Valid appointmentDate and appointmentTime are required." },
      { status: 400 },
    );
  }

  const result = rescheduleAppointment(
    getCurrentDoctorId(),
    (await params).id,
    appointmentDate,
    appointmentTime,
  );

  if (result.kind === "not-found") {
    return NextResponse.json(
      { error: "Appointment not found." },
      { status: 404 },
    );
  }

  if (result.kind === "conflict") {
    return NextResponse.json(
      {
        error: "This time slot is already booked. Please choose another time.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ appointment: result.appointment });
}
