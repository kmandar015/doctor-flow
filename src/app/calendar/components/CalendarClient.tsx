"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { AppointmentAvatar } from "../../dashboard/components/AppointmentAvatar";
import { AppointmentDetail } from "../../components/AppointmentDetail";
import { formatTime } from "@/lib/appointments/view-models";

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarAppointment = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  patient: string;
  initials: string;
  color: "blue" | "violet" | "green" | "peach";
  status: "CONFIRMED" | "PENDING";
  reason: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pads a number to 2 digits. */
const pad = (n: number) => String(n).padStart(2, "0");

/** Returns YYYY-MM-DD for (year, month 0-indexed, day). */
const toDateStr = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

/** Number of blank cells before the 1st of the month (Monday-first grid). */
const firstDayOffset = (year: number, month: number) =>
  (new Date(year, month, 1).getDay() + 6) % 7;

/** Number of days in a given month. */
const daysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarClient({
  appointments,
}: {
  appointments: CalendarAppointment[];
}) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Month navigation ──
  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(1);
  }
  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(1);
  }

  // ── Derived values ──
  const totalDays = daysInMonth(year, month);
  const blanks = firstDayOffset(year, month);
  const selectedDateStr = toDateStr(year, month, selectedDay);

  // Dates in the current month that have at least one appointment
  const appointmentDates = new Set(
    appointments
      .filter((a) => {
        const [y, m] = a.date.split("-").map(Number);
        return y === year && m === month + 1;
      })
      .map((a) => a.date),
  );

  // Appointments for the selected day, sorted by time
  const dayAppointments = appointments
    .filter((a) => a.date === selectedDateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const selectedDateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month, selectedDay));

  const isToday = selectedDateStr === todayStr;

  return (
    <>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1.55fr_0.8fr]">
        {/* ── Calendar grid ── */}
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6">
          {/* Month navigation */}
          <div className="mb-7 flex items-center justify-between">
            <button
              aria-label="Previous month"
              onClick={prevMonth}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-bold text-slate-800">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button
              aria-label="Next month"
              onClick={nextMonth}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
            {DAY_HEADERS.map((day) => (
              <span key={day} className="pb-4">
                {day}
              </span>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 gap-y-2">
            {/* Blank padding cells */}
            {Array.from({ length: blanks }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}

            {/* Day buttons */}
            {Array.from({ length: totalDays }, (_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(year, month, day);
              const hasAppt = appointmentDates.has(dateStr);
              const active = day === selectedDay;
              const isCurrentDay = dateStr === todayStr;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className="mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl text-sm font-semibold text-slate-600 transition hover:bg-teal-50"
                >
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-lg ${
                      active
                        ? "bg-brand text-white shadow-md shadow-teal-900/15"
                        : isCurrentDay
                          ? "ring-2 ring-brand ring-offset-1"
                          : ""
                    }`}
                  >
                    {day}
                  </span>
                  {hasAppt && (
                    <i
                      className={`h-1 w-1 rounded-full ${active ? "bg-white" : "bg-brand"}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Day schedule ── */}
        <aside className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6">
          <p className="text-sm font-medium text-brand">{selectedDateLabel}</p>
          <h2 className="mt-2 text-xl font-bold text-slate-800">
            {isToday
              ? "Today's schedule"
              : `Schedule · ${selectedDay} ${MONTH_NAMES[month]}`}
          </h2>

          <div className="mt-6 space-y-4">
            {dayAppointments.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No appointments on this day.
              </p>
            ) : (
              dayAppointments.map((appt) => (
                <button
                  key={appt.id}
                  onClick={() => setSelectedId(appt.id)}
                  className="flex w-full gap-3 border-l-2 border-brand pl-3 text-left transition hover:opacity-70"
                >
                  <p className="w-14 pt-1 text-xs font-bold text-slate-500">
                    {formatTime(appt.time)}
                  </p>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <AppointmentAvatar
                      initials={appt.initials}
                      color={appt.color}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-700">
                        {appt.patient}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {appt.reason}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <Link
            href="/bookings"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-50 py-3 text-sm font-bold text-brand hover:bg-teal-100"
          >
            <Clock3 size={16} />
            View all bookings
          </Link>
        </aside>
      </div>

      {/* Appointment detail drawer */}
      <AppointmentDetail
        appointmentId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
