import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/** Reachable without a doctor session. Each one does its own checks. */
const PUBLIC_EXACT = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);
const PUBLIC_PREFIXES = [
  "/api/whatsapp/webhook", // Meta calls this; verified by signature
  "/api/cron/", // scheduler calls this; verified by CRON_SECRET
];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const doctorId = token ? await verifySessionToken(token) : null;

  if (pathname === "/login" && doctorId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isPublic =
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isPublic || doctorId) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
