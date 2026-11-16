import { NextResponse } from "next/server";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { normalizePhone } from "@/lib/phone";
import { handleIncomingMessage } from "@/lib/whatsapp/bot";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { listMessagesForPhone } from "@/lib/whatsapp/messages";

export const runtime = "nodejs";

/**
 * Demo mode only: plays a patient sending a WhatsApp message, runs the same
 * assistant the real webhook runs, and returns the conversation.
 */
export async function POST(request: Request) {
  const doctorId = await getCurrentDoctorId();
  if (getWhatsAppConfig().mode !== "simulated") {
    return NextResponse.json(
      { error: "The simulator is only available in demo mode." },
      { status: 400 },
    );
  }

  let body: { phone?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : null;
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 1000) : "";
  if (!phone || !text) {
    return NextResponse.json(
      { error: "A valid phone number and a message are required." },
      { status: 400 },
    );
  }

  await handleIncomingMessage({ doctorId, phone, text });
  return NextResponse.json({ messages: listMessagesForPhone(doctorId, phone) });
}
