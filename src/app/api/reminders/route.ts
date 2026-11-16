import { NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { sendDueReminders } from "@/lib/whatsapp/notify";

export const runtime = "nodejs";

/** "Send reminders now" from the dashboard, for the signed-in doctor. */
export async function POST() {
  const result = await sendDueReminders(await getCurrentDoctorId());
  return NextResponse.json(result);
}
