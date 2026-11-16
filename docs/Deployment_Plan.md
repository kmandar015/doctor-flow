# Deployment Plan

Goal: put DoctorFlow (dashboard + WhatsApp webhook) and the clinic's landing page online
for **as little money and effort as possible**, without changing the code.

## Recommendation: Railway for both

| | Dashboard (`doctor-mvp`) | Landing page (`clinic dashboard`) |
|---|---|---|
| Host | **Railway** service + persistent **Volume** | **Railway**, a second service in the same project |
| Why | Runs Node 22 as a normal server, keeps the SQLite file on a disk, gives an HTTPS URL for Meta's webhook | One platform, one bill; it is a small static site |
| Deploys | Automatically on every `git push` | Same |
| Rough cost | Hobby plan, about **US $5/month**, which includes usage credit; a site this size usually fits inside it | Included in the same plan |

Prices change, so check railway.com/pricing before quoting.

### Why not Vercel's free plan?

- The dashboard keeps its data in a **SQLite file**. Vercel runs code in short-lived
  functions with no lasting disk, so the database would be wiped. It would need a move to
  a hosted database (Postgres/Turso) first. That's a good step later, not for a demo.
- Vercel's free Hobby plan is for **non-commercial** use. A clinic's website is
  commercial, so it would need the Pro plan.

### Other options considered

| Option | Verdict |
|---|---|
| Render | Free tier has no persistent disk → database lost on restart. Paid starter + disk works (about $7+/month). |
| Fly.io | Cheap, with volumes, but more command-line setup. |
| A VPS (Hetzner, DigitalOcean) | Cheapest at scale, but you manage the server, HTTPS and updates yourself. |
| Netlify / Cloudflare Pages | Good free option **for the landing page only**. |

---

## Step by step (about an hour the first time)

### 0. Before you start

- Push both projects to GitHub (separate repos, or one repo with two folders).
- `data/*.sqlite` is git-ignored; the database is created and seeded on first start.

### 1. Dashboard on Railway

1. railway.com → **New project → Deploy from GitHub repo** → pick `doctor-mvp`.
2. **Add a Volume** to the service, mount path `/data`.
3. **Variables** (copy from `.env.example`):
   - `DATABASE_PATH=/data/doctorflow.sqlite`
   - `AUTH_SECRET=` new random value (32+ chars)
   - `DOCTORFLOW_DEMO_PASSWORD=` strong password (set before the first start)
   - `NEXT_PUBLIC_CLINIC_TIME_ZONE=Asia/Kolkata`
   - `CRON_SECRET=` random value
   - WhatsApp values from `docs/WhatsApp_Setup_Guide.md` (or leave `WHATSAPP_PROVIDER=simulated`)
   - `NIXPACKS_NODE_VERSION=22` (the app needs Node 22.13+; `package.json` also says so)
4. Build command `npm run build`, start command `npm start` (Railway detects both).
5. **Settings → Networking → Generate domain** → e.g. `doctorflow.up.railway.app`.
6. In Meta, set the webhook to `https://<that domain>/api/whatsapp/webhook`.
   No tunnel needed any more.

### 2. Reminders every hour

Use a free scheduler such as cron-job.org (or a Railway cron service) to call, hourly:

```
GET https://<dashboard domain>/api/cron/reminders
Authorization: Bearer <CRON_SECRET>
```

Each confirmed appointment and pending follow-up gets exactly one reminder: normally the
day before, or on the day itself if the day-before run was missed. Calling it often is
safe.

### 3. Landing page on Railway

1. Same project → **New → GitHub repo** → pick the landing page.
2. Variables: `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_DASHBOARD_URL=https://<dashboard domain>`.
3. Generate a domain.

### 4. Your own domain (optional, about ₹800–1,000/year)

- `www.clinic-name.in` → landing page
- `app.clinic-name.in` → dashboard
- Add both as custom domains in Railway, and create the CNAME records it shows at your
  domain registrar. HTTPS is automatic.

### 5. Backups

The whole database is one file on the volume.
- Turn on Railway's volume backups, **or**
- download a copy weekly (Railway CLI: `railway run cp /data/doctorflow.sqlite ...`).
- Before real patient data: set up an automatic daily backup (e.g. Litestream to cheap
  object storage).

---

## Before real patients use it (after the demo)

- [ ] Change the demo doctor's email/password; add a "change password" screen.
- [ ] Meta business verification and the clinic's own WhatsApp number (see the setup guide).
- [ ] Daily automatic backups.
- [ ] Privacy policy page (the landing page links to `/privacy-policy`, which does not exist yet).
- [ ] Patient consent wording for WhatsApp messages; India's DPDP Act applies to health data.
- [ ] Upgrade to Next.js 16 when convenient (the 15.x line only gets security backports).
- [ ] Multi-doctor clinics: move from SQLite to Postgres, and map each WhatsApp number to a doctor.
