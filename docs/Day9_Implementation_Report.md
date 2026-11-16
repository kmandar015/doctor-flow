# Day 9 Implementation Report: Login, WhatsApp Assistant & Demo Readiness

## Objective

Make DoctorFlow demo-ready for a client: fix the bugs found in review, add doctor
sign-in, and add the WhatsApp side. Patients book, check and cancel appointments on
WhatsApp, and get confirmations, follow-up notices and reminders there. Patients get
no website; the WhatsApp assistant is their whole interface.

---

## 1. Bug fixes from the review

| Bug | Fix |
|---|---|
| Dashboard **Reject** always failed (409) | `PENDING → REJECTED` added to the allowed transitions |
| Dates off by one day in India (UTC "today"; seed data a day early; month end wrong; past-slot check mixed UTC/local) | New `src/lib/dates.ts` works in the clinic's time zone; used everywhere |
| Production build showed build-time data on Dashboard, Calendar, Patients | Pages marked `force-dynamic` |
| Lint error in Reports page broke `next build` | Loading state derived instead of set inside the effect |
| Rejected appointments still blocked their slot | Excluded from conflict and slot checks |
| "Total Patients" left out walk-ins | Counts every patient record |

## 2. Security upgrade

- Next.js **15.1.0 → 15.5.29**, React **19.0.0 → 19.0.9**: fixes published critical
  issues, including a middleware auth bypass and remote-code-execution flaws.
- PostCSS updated. The remaining `npm audit` notice is PostCSS bundled inside Next
  (build-time only), fixable only by moving to Next 16.

## 3. Doctor sign-in

- `/login` page; session in a signed, HTTP-only cookie (HMAC-SHA256, 12 hours).
- Passwords hashed with scrypt; brute-force guard on the login route.
- `src/middleware.ts` sends signed-out visitors to `/login` (APIs get 401).
  `getCurrentDoctorId()` checks the session again, so data never depends on middleware alone.
- Header menu with the doctor's name and **Log out**. Sidebar, greeting and Account use
  the real doctor record.
- **My account** now saves (`PATCH /api/account`) and shows the WhatsApp connection status.

## 4. Phone numbers

All numbers are stored as E.164 (`+919876543210`), so a number typed in the dashboard
matches the one WhatsApp sends. Existing rows are converted on start-up. Display stays
`+91 98765 43210`. Search ignores spaces.

## 5. WhatsApp assistant

**Modes.** `WHATSAPP_PROVIDER=simulated` (default) sends nothing and lets you play
patients from the WhatsApp page. `meta` uses the WhatsApp Cloud API
(`docs/WhatsApp_Setup_Guide.md`).

**Menu bot** (`src/lib/whatsapp/bot.ts`), replying with numbers:

1. **Book**: asks the name (new numbers only), offers the next 6 days with free
   slots, then the free times, then the reason. Creates a `PENDING` appointment with
   source `WHATSAPP`, which lands in the dashboard's Pending requests.
2. **My appointments**: upcoming, with confirmed/awaiting status.
3. **My follow-ups**: pending, overdue marked.
4. **Cancel**: pick an upcoming appointment.
5. **Clinic timings**: from the Availability settings.

"0", "hi" or "menu" always returns to the menu; a conversation resets after 30 minutes
of silence. The free-slot logic is shared with the dashboard (`getAvailableSlots`).

**Messages sent when the doctor acts:** confirmed, rejected, cancelled, completed
(thank-you), rescheduled, follow-up scheduled, and a welcome for new walk-in patients.

**Reminders:** confirmed appointments and pending follow-ups due today (still ahead) or
tomorrow, once each (`reminder_sent_at`). Triggered by **Send reminders** on the
dashboard or by a scheduler (`GET /api/cron/reminders` with `CRON_SECRET`). Rescheduling
re-arms the reminder.

**Webhook** `/api/whatsapp/webhook`: Meta's GET verification, POST signature check
(`X-Hub-Signature-256` with the app secret), duplicate deliveries ignored.

**Message log:** every message in and out is stored in `whatsapp_messages`, with
delivery status and Meta's error if one failed.

## 6. Dashboard UI

- **WhatsApp page** (`/whatsapp`, in the sidebar and header): conversation list, chat
  view; in demo mode, a patient simulator with quick replies. Refreshes every 4 seconds.
- **Patient record:** WhatsApp panel with the latest messages and "Open chat".
- **WhatsApp badge** on bookings, pending requests and the appointment drawer.
- **Send reminders** button on the dashboard.
- Dashboard and Bookings refresh every 15 seconds, so WhatsApp bookings appear without
  reloading.

## 7. Landing page (`clinic dashboard`)

- WhatsApp buttons open a chat with the assistant with "Hi" pre-filled; the number
  comes from `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- Footer **Doctor login** link to the dashboard (`NEXT_PUBLIC_DASHBOARD_URL`).
- Next.js 14.2.21 → 14.2.35 (security patches).

## Database changes

New columns: `doctors.password_hash`, `appointments.reminder_sent_at`,
`follow_ups.reminder_sent_at`. New tables: `whatsapp_sessions`, `whatsapp_messages`.
All are added automatically on start-up, without losing data. The database path can be
set with `DATABASE_PATH`; WAL mode is on.

## New and changed API

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/login`, `POST /api/auth/logout` | Sign in/out |
| `GET/PATCH /api/account` | Doctor profile |
| `GET/POST /api/whatsapp/webhook` | Meta webhook (public, signature-checked) |
| `POST /api/whatsapp/simulate` | Demo mode: play a patient |
| `GET /api/whatsapp/messages` | Conversations / one conversation / one patient |
| `POST /api/reminders` | Send due reminders now |
| `GET /api/cron/reminders` | Same, for a scheduler (Bearer `CRON_SECRET`) |

Every existing endpoint now requires a signed-in doctor.

## Testing

- `npx tsc --noEmit`, `npm run lint`, `npm run build`: pass.
- Tested against the running app:
  - sign-in, wrong password, forged cookie, logout;
  - every page;
  - a full WhatsApp booking (new and existing patient), invalid input, cancel, timings;
  - accept, reschedule, follow-up and walk-in messages;
  - reminders sent once, then 0 on the second run;
  - webhook verification refused with a wrong token, duplicate delivery ignored;
  - cron refused without the secret.
- Real Meta delivery is **not yet tested**; it needs the Meta app from the setup guide.

## Known limits

- One clinic WhatsApp number maps to one doctor (`WHATSAPP_DOCTOR_ID`).
- No "change password" screen yet; the demo password comes from env.
- Meta's 24-hour rule: reminders to patients who haven't written recently need an
  approved template.
