import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { listFollowUps, createFollowUp } from "@/lib/database/followUps";
import { type FollowUpStatus, followUpStatuses } from "@/lib/database/types";

export const runtime = "nodejs";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const filter = searchParams.get("filter");

  if (status && !followUpStatuses.includes(status as FollowUpStatus)) {
    return NextResponse.json(
      { error: "Invalid status filter." },
      { status: 400 },
    );
  }

  const validFilters = ["today", "upcoming", "overdue", "completed", "all"];
  if (filter && !validFilters.includes(filter)) {
    return NextResponse.json({ error: "Invalid filter." }, { status: 400 });
  }

  return NextResponse.json({
    followUps: listFollowUps(getCurrentDoctorId(), {
      status: status as FollowUpStatus | undefined,
      filter: filter as
        | "today"
        | "upcoming"
        | "overdue"
        | "completed"
        | "all"
        | undefined,
    }),
  });
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
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = body as {
    patientId?: unknown;
    appointmentId?: unknown;
    followUpDate?: unknown;
    reason?: unknown;
    notes?: unknown;
  };

  if (
    typeof input.patientId !== "string" ||
    !input.patientId.trim() ||
    typeof input.followUpDate !== "string" ||
    !datePattern.test(input.followUpDate)
  ) {
    return NextResponse.json(
      { error: "Patient ID and a valid follow-up date are required." },
      { status: 400 },
    );
  }

  const text = (value: unknown) =>
    typeof value === "string" ? value.trim() || undefined : undefined;

  try {
    const followUp = createFollowUp(getCurrentDoctorId(), {
      patientId: input.patientId.trim(),
      appointmentId: text(input.appointmentId),
      followUpDate: input.followUpDate,
      reason: text(input.reason),
      notes: text(input.notes),
    });
    return NextResponse.json({ followUp }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("unauthorized")
      ) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
