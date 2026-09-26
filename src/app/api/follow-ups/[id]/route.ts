import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import {
  getFollowUpById,
  updateFollowUp,
  completeFollowUp,
  cancelFollowUp,
} from "@/lib/database/followUps";

export const runtime = "nodejs";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const followUp = getFollowUpById(getCurrentDoctorId(), (await params).id);
  if (!followUp) {
    return NextResponse.json(
      { error: "Follow-up not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ followUp });
}

export async function PATCH(
  request: NextRequest,
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
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = body as {
    status?: string;
    followUpDate?: string;
    reason?: string;
    notes?: string;
  };

  const doctorId = getCurrentDoctorId();
  let result;

  try {
    const id = (await params).id;
    if (input.status) {
      if (input.status === "COMPLETED") {
        result = completeFollowUp(doctorId, id);
      } else if (input.status === "CANCELLED") {
        result = cancelFollowUp(doctorId, id);
      } else {
        return NextResponse.json(
          { error: "Invalid status update." },
          { status: 400 },
        );
      }
    } else {
      if (input.followUpDate && !datePattern.test(input.followUpDate)) {
        return NextResponse.json(
          { error: "Invalid follow-up date." },
          { status: 400 },
        );
      }
      result = updateFollowUp(doctorId, id, {
        followUpDate: input.followUpDate,
        reason: input.reason,
        notes: input.notes,
      });
    }

    if (result.kind === "not-found") {
      return NextResponse.json(
        { error: "Follow-up not found." },
        { status: 404 },
      );
    }
    if (result.kind === "invalid-transition") {
      return NextResponse.json(
        {
          error: "Invalid status transition.",
          currentStatus: result.currentStatus,
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ followUp: result.followUp });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
