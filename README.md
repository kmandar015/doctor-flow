# DoctorFlow

A practice dashboard for doctors (appointments, calendar, patients, follow-ups, reports),
plus a **WhatsApp assistant** that lets patients book, check and cancel appointments and
receive confirmations and reminders. Patients get no website; WhatsApp is their
interface.

Next.js 15 (App Router) · SQLite via Node's built-in `node:sqlite` · Tailwind CSS.

## Run it

Requires **Node.js 22.13+**.

```bash
npm install
cp .env.example .env.local   # then fill in AUTH_SECRET and DOCTORFLOW_DEMO_PASSWORD
npm run dev
```

Open <http://localhost:3000> and sign in as `meera.shah@doctorflow.test` with the password
from `DOCTORFLOW_DEMO_PASSWORD`. The database (`data/doctorflow.sqlite`) is created and
filled with demo data on first start. Delete or rename it to start fresh.

WhatsApp starts in **demo mode**: open **WhatsApp** in the sidebar and play a patient.
To use real WhatsApp, follow [docs/WhatsApp_Setup_Guide.md](docs/WhatsApp_Setup_Guide.md).

## Docs

- [Demo script](docs/Demo_Script.md)
- [WhatsApp setup](docs/WhatsApp_Setup_Guide.md)
- [Deployment plan](docs/Deployment_Plan.md)
- Daily reports: `docs/day-3-changes.md` … `docs/Day9_Implementation_Report.md`
- API collection: `docs/DoctorFlow.postman_collection.json`

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```
