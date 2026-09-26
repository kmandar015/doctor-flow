import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { getDoctorAvailability } from "@/lib/database/availability";
import { listAppointments } from "@/lib/database/appointments";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");
  const excludeId = searchParams.get("excludeId");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Valid date is required." },
      { status: 400 },
    );
  }

  const doctorId = getCurrentDoctorId();
  const availability = getDoctorAvailability(doctorId) || {
    doctorId,
    workingDays: [1, 2, 3, 4, 5],
    workStart: "09:00",
    workEnd: "17:00",
    breakStart: null,
    breakEnd: null,
    slotDuration: 30,
  };

  const dayOfWeek = new Date(date + "T00:00:00").getDay();
  if (!availability.workingDays.includes(dayOfWeek)) {
    return NextResponse.json({ slots: [] });
  }

  let appointments = listAppointments(doctorId, { date });
  if (excludeId) {
    appointments = appointments.filter((a) => a.id !== excludeId);
  }

  const bookedTimes = new Set(
    appointments
      .filter((a) => a.status !== "CANCELLED")
      .map((a) => a.appointmentTime),
  );

  const slots = [];
  const now = new Date();
  const isToday = date === now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);

  let [hour, minute] = availability.workStart.split(":").map(Number);
  const [endHour, endMinute] = availability.workEnd.split(":").map(Number);

  while (hour < endHour || (hour === endHour && minute < endMinute)) {
    const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

    let isBreak = false;
    if (availability.breakStart && availability.breakEnd) {
      if (
        timeString >= availability.breakStart &&
        timeString < availability.breakEnd
      ) {
        isBreak = true;
      }
    }

    const isPast = isToday && timeString < currentTime;
    const isBooked = bookedTimes.has(timeString);

    if (!isBreak && !isPast && !isBooked) {
      slots.push(timeString);
    }

    minute += availability.slotDuration;
    while (minute >= 60) {
      hour += 1;
      minute -= 60;
    }
  }

  return NextResponse.json({ slots });
}
