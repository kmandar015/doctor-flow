/**
 * Phone numbers are stored as E.164 (`+919876543210`) so that a number typed
 * in the dashboard ("98765 43210", "+91 98765 43210", "098765 43210") and the
 * number WhatsApp sends ("919876543210") are the same string.
 *
 * Safe to import from both server and client code.
 */

export const DEFAULT_COUNTRY_CODE =
  process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE || "91";

/** Returns `+<digits>` or null when the input cannot be a phone number. */
export function normalizePhone(
  input: string,
  countryCode: string = DEFAULT_COUNTRY_CODE,
): string | null {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (trimmed.startsWith("+")) {
    // Already has a country code.
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = countryCode + digits.slice(1);
  } else if (digits.length === 10) {
    digits = countryCode + digits;
  }

  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
}

/** Display form: `+91 98765 43210` for Indian numbers, E.164 otherwise. */
export function formatPhone(phone: string) {
  const match = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return match ? `+91 ${match[1]} ${match[2]}` : phone;
}

/** WhatsApp Cloud API wants the number without the leading "+". */
export function toWhatsAppId(phone: string) {
  return phone.replace(/^\+/, "");
}
