import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { getPatientFollowUps } from "@/lib/database/followUps";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return NextResponse.json({
    followUps: getPatientFollowUps(getCurrentDoctorId(), (await params).id),
  });
}
