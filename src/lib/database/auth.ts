import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/** The signed-in doctor's ID, or null when there is no valid session. */
export async function getSessionDoctorId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

/**
 * The signed-in doctor's ID. Middleware already blocks unauthenticated
 * requests; this is the second check, so data access never depends on
 * middleware alone. Without a session it redirects to /login.
 *
 * API handlers never accept a doctor ID from the browser.
 */
export async function getCurrentDoctorId(): Promise<string> {
  const doctorId = await getSessionDoctorId();
  if (!doctorId) redirect("/login");
  return doctorId;
}

/**
 * The doctor that WhatsApp messages belong to. The webhook has no browser
 * session, so the clinic's WhatsApp number maps to one doctor via env.
 */
export function getWhatsAppDoctorId() {
  return (
    process.env.WHATSAPP_DOCTOR_ID ||
    process.env.DOCTORFLOW_DEV_DOCTOR_ID ||
    "doctor-meera-shah"
  );
}
