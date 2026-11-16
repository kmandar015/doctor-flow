import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from "@/lib/auth/session";
import { getDoctorCredentialsByEmail } from "@/lib/database/doctors";

export const runtime = "nodejs";

// Simple in-memory brute-force guard: 10 failed attempts per IP per 15 min.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  const now = Date.now();
  const entry = failures.get(key);
  if (entry && entry.resetAt > now && entry.count >= MAX_FAILURES) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const found = getDoctorCredentialsByEmail(body.email.trim());
  if (!found || !verifyPassword(body.password, found.passwordHash)) {
    const current =
      entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };
    current.count += 1;
    failures.set(key, current);
    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 },
    );
  }

  failures.delete(key);
  const response = NextResponse.json({
    doctor: { name: found.doctor.name },
  });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(found.doctor.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
