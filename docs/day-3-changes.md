# Day 3 — Backend & Data Wiring

## Overview

Day 3 connected the existing UI to a real database and removed all static mock data.
The full appointment flow — Patient → Database → Dashboard → Accept/Reject → Database update → Dashboard refresh — now works end to end.

---

## Database

**Technology:** SQLite via `node:sqlite` (built into Node.js 22, no npm package needed)  
**File location:** `data/doctorflow.sqlite` (auto-created on first run)

### File: `src/lib/database/db.ts`

- Opens (or creates) the SQLite file at `data/doctorflow.sqlite`
- Runs `migrate()` on every startup — creates tables with `CREATE TABLE IF NOT EXISTS` (safe to run repeatedly)
- Runs `seedDevelopmentDatabase()` — inserts demo data only when the `doctors` table is empty
- Returns a singleton `DatabaseSync` instance reused across all requests

### Schema created

```
doctors       — id, name, email, phone, specialization, clinic_name, created_at, updated_at
patients      — id, name, phone (UNIQUE), email, date_of_birth, gender, created_at, updated_at
appointments  — id, doctor_id (FK), patient_id (FK), appointment_date, appointment_time,
                reason, notes, status (CHECK), source (CHECK), created_at, updated_at
```

**Indexes:** `doctor_id`, `patient_id`, `appointment_date`, `status`, `patients.phone`

**Status values:** `PENDING` | `CONFIRMED` | `REJECTED` | `COMPLETED` | `CANCELLED`  
**Source values:** `WHATSAPP` | `DASHBOARD` | `MANUAL`

---

## Seed Data

### File: `src/lib/database/seed.ts`

Inserts demo data only if the `doctors` table is empty (idempotent).

| Entity       | Count | Details                                                             |
| ------------ | ----- | ------------------------------------------------------------------- |
| Doctor       | 1     | Dr. Meera Shah — General Physician, Meera Care Clinic               |
| Patients     | 5     | Aarav Mehta, Neha Kulkarni, Vikram Singh, Priya Patil, Rahul Sharma |
| Appointments | 6     | 2 PENDING, 2 CONFIRMED, 1 COMPLETED, 1 CANCELLED                    |

---

## Database Layer

### File: `src/lib/database/types.ts`

TypeScript types shared across the database and API layers:

- `AppointmentStatus` — union of all valid status strings
- `AppointmentSource` — union of all valid source strings
- `Patient`, `Doctor`, `Appointment` — row shapes returned from queries

### File: `src/lib/database/appointments.ts`

All database query functions:

| Function                                            | Purpose                                                                                      |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `listAppointments(doctorId, filters?)`              | Returns appointments for a doctor; supports `status`, `date`, `from`, `to` filters           |
| `getAppointment(doctorId, id)`                      | Returns a single appointment with joined patient data, or `null`                             |
| `createAppointment(doctorId, input)`                | Upserts patient by phone, then creates appointment with `status = PENDING`                   |
| `updateAppointmentStatus(doctorId, id, nextStatus)` | Validates transition, updates status, returns `updated` / `not-found` / `invalid-transition` |
| `listPatients(doctorId)`                            | Returns all patients with last visit date and total visit count                              |
| `getDashboardSummary(doctorId)`                     | Returns all appointments + patient count + stats (today / pending / completed / total)       |

**Status transition rules:**

```
PENDING    → CONFIRMED, REJECTED
CONFIRMED  → COMPLETED, CANCELLED
REJECTED   → (terminal)
COMPLETED  → (terminal)
CANCELLED  → (terminal)
```

### File: `src/lib/database/auth.ts`

Temporary dev identity boundary — reads `DOCTORFLOW_DEV_DOCTOR_ID` from the environment.  
All API routes call `getCurrentDoctorId()` from here instead of accepting a doctor ID from the browser.  
Replace this function with real session auth when authentication is introduced.

---

## API Routes

### `GET /api/appointments`

Lists all appointments for the current doctor.

Query params: `?status=PENDING` | `?date=YYYY-MM-DD` | `?from=YYYY-MM-DD&to=YYYY-MM-DD`

### `POST /api/appointments`

Creates a new appointment.

- Upserts patient by phone number (no duplicate patients)
- Defaults `status` to `PENDING`
- Accepts `source: WHATSAPP | DASHBOARD | MANUAL`
- This endpoint is ready for the future WhatsApp webhook to call

### `GET /api/appointments/:id`

Returns a single appointment with full patient details. Returns `404` if not found or belongs to a different doctor.

### `PATCH /api/appointments/:id/status`

Updates appointment status.

- Validates the transition is legal
- Returns `409` for invalid transitions
- Returns `404` if appointment not found

---

## Environment Variables

### File: `.env.local` _(new — not committed)_

```
DOCTORFLOW_DEV_DOCTOR_ID=doctor-meera-shah
```

### File: `.env.example` _(pre-existing)_

Documents the variable with a comment explaining its purpose.

---

## View-Model Layer

### File: `src/lib/appointments/view-models.ts`

Converts raw database rows into the UI shape (`UiAppointment`, `Patient`) that React components consume.

**Shared helpers extracted to remove duplication:**

| Helper                         | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `deriveInitials(name)`         | Extracts 1–2 letter initials from a full name               |
| `deriveAge(dateOfBirth)`       | Calculates whole-year age from an ISO date string           |
| `deriveColor(name)`            | Picks a deterministic avatar colour from the shared palette |
| `formatDate(date)`             | Formats a `YYYY-MM-DD` string to `"12 Sep 2026"`            |
| `formatTime(time)`             | Formats a `HH:MM` string to `"10:00 am"`                    |
| `toUiAppointment(appointment)` | Maps a DB `Appointment` row to `UiAppointment`              |
| `toUiPatient(row)`             | Maps a DB patient row to the UI `Patient` type              |

---

## Pages Connected to Real Data

### `src/app/dashboard/page.tsx`

**Before:** Imported static arrays from `dashboard/data.ts`  
**After:** Calls `getDashboardSummary()` at render time

- Stats cards show real counts from the database
- Pending requests section shows real `PENDING` appointments
- Today's appointments shows confirmed/completed appointments for today
- Upcoming section shows future `CONFIRMED` appointments
- Header date is dynamic (no hardcoded date)

### `src/app/bookings/page.tsx`

**Before:** Imported `allBookings` from `dashboard/data.ts`  
**After:** Calls `listAppointments()` and maps through `toUiAppointment()`

### `src/app/patients/page.tsx`

**Before:** Imported static `patients` array from `dashboard/data.ts`  
**After:** Calls `listPatients()` and maps through `toUiPatient()`

---

## Components Updated

### `src/app/dashboard/components/AppointmentList.tsx`

- Removed hardcoded `"Saturday, 12 September"` date string
- Replaced with dynamic `Intl.DateTimeFormat` label computed at render time
- Added empty state message when no appointments exist

### `src/app/dashboard/components/PendingRequests.tsx`

_(Pre-existing — no changes needed)_  
Already wired to `PATCH /api/appointments/:id/status` for Accept/Reject actions.  
Removes accepted/rejected cards from local state and calls `router.refresh()` to re-fetch server data.

---

## Duplication Removed

| Duplicate                          | Resolution                                       |
| ---------------------------------- | ------------------------------------------------ |
| `colors` array in two files        | Lives only in `view-models.ts`                   |
| Initials logic in two files        | Consolidated into `deriveInitials()`             |
| Age calculation in two files       | Consolidated into `deriveAge()`                  |
| Avatar colour pick in two files    | Consolidated into `deriveColor()`                |
| Date formatting in two files       | Reused via `formatDate()` inside `toUiPatient()` |
| Hardcoded date string in component | Replaced with dynamic `Intl.DateTimeFormat`      |

---

## What is NOT Yet Implemented

- Real authentication (replaced temporarily by `DOCTORFLOW_DEV_DOCTOR_ID`)
- WhatsApp webhook (the API is ready to receive calls from it)
- Appointment detail modal/drawer connected to real data
- Calendar page connected to real data
- New Booking form UI wired to `POST /api/appointments`
