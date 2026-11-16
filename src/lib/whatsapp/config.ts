import "server-only";

/**
 * WhatsApp runs in one of two modes:
 *
 * - "meta":      real messages through the WhatsApp Cloud API (Meta).
 *                Needs WHATSAPP_PROVIDER=meta plus a token and phone number ID.
 * - "simulated": nothing leaves the machine. Outgoing messages are stored in
 *                the message log, and patients are played from /whatsapp.
 *                Used for demos before Meta is set up.
 */
export type WhatsAppMode = "meta" | "simulated";

export function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const mode: WhatsAppMode =
    process.env.WHATSAPP_PROVIDER === "meta" && accessToken && phoneNumberId
      ? "meta"
      : "simulated";

  return {
    mode,
    accessToken,
    phoneNumberId,
    apiVersion: process.env.WHATSAPP_API_VERSION || "v23.0",
    /** Any string you choose; Meta echoes it back when verifying the webhook. */
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    /** App secret from the Meta app; used to check webhook signatures. */
    appSecret: process.env.WHATSAPP_APP_SECRET || "",
    /** The clinic's WhatsApp number as patients see it, e.g. +91 98765 21098. */
    displayNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
    /**
     * Optional approved template for messages sent outside WhatsApp's 24-hour
     * window (reminders). One body parameter: the full message text.
     */
    reminderTemplate: process.env.WHATSAPP_REMINDER_TEMPLATE || "",
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en",
  };
}
