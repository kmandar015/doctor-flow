import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { normalizePhone } from "@/lib/phone";
import {
  listConversations,
  listMessagesForPatient,
  listMessagesForPhone,
} from "@/lib/whatsapp/messages";

export const runtime = "nodejs";

/**
 * ?phone=+91…     one conversation
 * ?patientId=…    one patient's messages
 * (neither)       the list of conversations
 */
export async function GET(request: NextRequest) {
  const doctorId = await getCurrentDoctorId();
  const params = request.nextUrl.searchParams;
  const phone = params.get("phone");
  const patientId = params.get("patientId");

  if (phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
    }
    return NextResponse.json({ messages: listMessagesForPhone(doctorId, normalized) });
  }
  if (patientId) {
    return NextResponse.json({ messages: listMessagesForPatient(doctorId, patientId) });
  }
  return NextResponse.json({ conversations: listConversations(doctorId) });
}
