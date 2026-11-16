import "server-only";

import { toWhatsAppId } from "@/lib/phone";
import { getWhatsAppConfig } from "./config";
import { logMessage, type MessageKind } from "./messages";

type SendOptions = {
  doctorId: string;
  kind: MessageKind;
  appointmentId?: string | null;
  followUpId?: string | null;
  /**
   * Business-initiated messages (reminders, status updates) may fall outside
   * WhatsApp's 24-hour window; they retry with the approved template if one
   * is configured.
   */
  allowTemplateFallback?: boolean;
};

export type SendResult = { ok: boolean; status: "SENT" | "FAILED" | "SIMULATED"; error?: string };

// Meta error code for "more than 24 hours since the customer last replied".
const OUTSIDE_WINDOW_CODE = 131047;

async function callMeta(payload: Record<string, unknown>) {
  const config = getWhatsAppConfig();
  const response = await fetch(
    `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  const data = (await response.json().catch(() => ({}))) as {
    messages?: Array<{ id: string }>;
    error?: { message?: string; code?: number };
  };
  return {
    ok: response.ok,
    id: data.messages?.[0]?.id ?? null,
    code: data.error?.code,
    error: data.error?.message ?? (response.ok ? undefined : `HTTP ${response.status}`),
  };
}

/**
 * Sends a text message to a patient and records it in the message log.
 * Never throws: a WhatsApp failure must not undo the doctor's action.
 */
export async function sendWhatsAppText(
  phone: string,
  body: string,
  options: SendOptions,
): Promise<SendResult> {
  const config = getWhatsAppConfig();
  const base = {
    doctorId: options.doctorId,
    phone,
    direction: "OUT" as const,
    kind: options.kind,
    body,
    appointmentId: options.appointmentId,
    followUpId: options.followUpId,
  };

  if (config.mode === "simulated") {
    logMessage({ ...base, status: "SIMULATED" });
    return { ok: true, status: "SIMULATED" };
  }

  try {
    let result = await callMeta({
      to: toWhatsAppId(phone),
      type: "text",
      text: { body, preview_url: false },
    });

    if (
      !result.ok &&
      result.code === OUTSIDE_WINDOW_CODE &&
      options.allowTemplateFallback &&
      config.reminderTemplate
    ) {
      result = await callMeta({
        to: toWhatsAppId(phone),
        type: "template",
        template: {
          name: config.reminderTemplate,
          language: { code: config.templateLanguage },
          components: [
            {
              type: "body",
              // Template values may not contain line breaks or runs of spaces.
              parameters: [
                {
                  type: "text",
                  text: body.replace(/\s*\n+\s*/g, " · ").replace(/ {2,}/g, " ").slice(0, 1000),
                },
              ],
            },
          ],
        },
      });
    }

    if (result.ok) {
      logMessage({ ...base, status: "SENT", providerMessageId: result.id });
      return { ok: true, status: "SENT" };
    }
    logMessage({ ...base, status: "FAILED", error: result.error });
    console.error("WhatsApp send failed:", result.code, result.error);
    return { ok: false, status: "FAILED", error: result.error };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logMessage({ ...base, status: "FAILED", error: message });
    console.error("WhatsApp send failed:", message);
    return { ok: false, status: "FAILED", error: message };
  }
}
