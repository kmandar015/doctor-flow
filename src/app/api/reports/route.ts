import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { getReportSummary } from "@/lib/database/reports";

export const runtime = "nodejs";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Both 'from' and 'to' date parameters are required." },
      { status: 400 },
    );
  }

  if (!datePattern.test(from) || !datePattern.test(to)) {
    return NextResponse.json(
      { error: "Dates must be in YYYY-MM-DD format." },
      { status: 400 },
    );
  }

  if (from > to) {
    return NextResponse.json(
      { error: "'from' date must not be after 'to' date." },
      { status: 400 },
    );
  }

  try {
    const report = getReportSummary((await getCurrentDoctorId()), from, to);
    return NextResponse.json(report);
  } catch (error: unknown) {
    console.error("Reports API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
