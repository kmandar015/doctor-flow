import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppDoctorId } from "@/lib/database/auth";
import { normalizePhone } from "@/lib/phone";
import { handleIncomingMessage } from "@/lib/whatsapp/bot";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { isDuplicateIncoming } from "@/lib/whatsapp/messages";

export const runtime = "nodejs";

/**
 * Meta calls GET once when you save the webhook URL, to check you own it.
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const { verifyToken } = getWhatsAppConfig();
  if (
    verifyToken &&
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === verifyToken
  ) {
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed." }, { status: 403 });
}

function hasValidSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const received = Buffer.from(header.slice("sha256=".length), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

type IncomingMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string; id?: string };
    list_reply?: { title?: string; id?: string };
  };
};

type WebhookBody = {
  object?: string;
  entry?: Array<{ changes?: Array<{ value?: { messages?: IncomingMessage[] } }> }>;
};

function messageText(message: IncomingMessage) {
  if (message.type === "text") return message.text?.body ?? "";
  if (message.type === "button") return message.button?.text ?? "";
  if (message.type === "interactive") {
    return (
      message.interactive?.button_reply?.id ??
      message.interactive?.list_reply?.id ??
      ""
    );
  }
  return ""; // images, voice notes, etc. are answered with the menu.
}

/** Incoming messages (and delivery statuses, which are ignored here). */
export async function POST(request: NextRequest) {
  const config = getWhatsAppConfig();
  const rawBody = await request.text();

  if (config.appSecret) {
    if (!hasValidSignature(rawBody, request.headers.get("x-hub-signature-256"), config.appSecret)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("WHATSAPP_APP_SECRET is not set; rejecting webhook call.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const doctorId = getWhatsAppDoctorId();
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        const phone = normalizePhone(`+${message.from}`);
        if (!phone || isDuplicateIncoming(message.id)) continue;
        await handleIncomingMessage({
          doctorId,
          phone,
          text: messageText(message) || "menu",
          providerMessageId: message.id,
        });
      }
    }
  }

  // Always 200 for a valid call, or Meta keeps retrying the same delivery.
  return NextResponse.json({ ok: true });
}
