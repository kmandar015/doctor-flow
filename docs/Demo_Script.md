# Client Demo Script (about 15 minutes)

## Before the client arrives

1. Fresh demo data: stop the server, rename `data/doctorflow.sqlite` to a backup name,
   start the server. It reseeds with appointments for today and tomorrow.
2. `npm run build && npm start` (faster than dev mode), open <http://localhost:3000>.
   In this mode the sign-in cookie is HTTPS-only. Use `localhost` or the https tunnel
   address, not `http://192.168…` from another device, or sign-in will not stick.
3. Sign-in details are in `.env.local` (`DOCTORFLOW_DEMO_PASSWORD`, email
   `meera.shah@doctorflow.test`).
4. Open the landing page in a second tab.
5. **Real WhatsApp:** tunnel running, webhook verified, the client's phone added as a
   test number (see `WhatsApp_Setup_Guide.md`). **No Meta yet:** use the WhatsApp page's
   simulator; the flow is identical.

## The story

**1. The patient finds the clinic (landing page, 1 min).**
Scroll the site, click **WhatsApp Us**. WhatsApp opens with "Hi" ready to send.

**2. The patient books on WhatsApp (3 min).**
Send *Hi*, then: `1` (book), the patient's name, pick a day, pick a time, give a reason.
Point out:
- only free slots are offered (working hours, break, existing bookings);
- no app, no website login for the patient.

**3. The doctor sees it (dashboard, 2 min).**
Within 15 seconds the request appears under **Pending requests** with a green
**WhatsApp** badge. Click **Accept**, and the patient's phone gets the confirmation.

**4. Day-to-day management (4 min).**
- **Bookings:** filter and search, open a booking, **Reschedule** (the patient is told
  the new time).
- **Calendar:** month view and the day's schedule with free slots.
- **Patients:** register a walk-in (they get a WhatsApp welcome), open a patient record:
  history, notes, and their WhatsApp conversation.
- **Follow-ups:** from an appointment, **Add follow-up**; the patient is messaged. Show
  overdue and today.

**5. Automatic reminders (1 min).**
Tomorrow's confirmed visits and due follow-ups get a WhatsApp reminder from the hourly
job. To trigger it during the demo, call it with the `CRON_SECRET` from `.env.local`:
`curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/reminders`.

**6. Patient self-service (2 min).**
On the phone: `2` (my appointments), `3` (my follow-ups), `4` (cancel). The cancellation
shows up on the dashboard.

**7. Practice overview (1 min).**
**Reports:** this month's appointments, completion and cancellation rates, new patients,
CSV export. **Availability:** change hours or the break; the bot offers new slots at once.

## Likely questions

- **Cost?** Hosting about US $5/month. WhatsApp: patient-started chats are free;
  reminders cost a fraction of a rupee each (Meta's rate card).
- **Their own number?** Yes, after Meta business verification (a few days).
- **Several doctors?** The data model is per doctor already; a multi-doctor clinic is a
  next phase.
- **Data safety?** Each doctor sees only their own patients; sign-in is required;
  messages are verified as coming from Meta.
