import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/whatsapp/notify";

export const runtime = "nodejs";

/**
 * For a scheduler (e.g. a cron job every hour):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/reminders
 * Sends due reminders for every doctor. Each item is reminded only once.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const received = Buffer.from(header);
  if (
    !secret ||
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json(await sendDueReminders());
}
