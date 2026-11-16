import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { getAvailableSlots } from "@/lib/database/availability";

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

  const slots = getAvailableSlots(
    await getCurrentDoctorId(),
    date,
    excludeId ?? undefined,
  );
  return NextResponse.json({ slots });
}
