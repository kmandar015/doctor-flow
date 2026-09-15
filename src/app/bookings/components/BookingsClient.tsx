"use client";

import {
  CalendarDays,
  CalendarPlus,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { UiAppointment } from "@/lib/appointments/view-models";
import { AppointmentAvatar } from "../../dashboard/components/AppointmentAvatar";
import { AppointmentDetail } from "../../components/AppointmentDetail";
import { NewBookingDrawer } from "../../components/NewBookingDrawer";

// ─── Filter options ───────────────────────────────────────────────────────────

type FilterOption = "All" | UiAppointment["status"];

const FILTERS: FilterOption[] = [
  "All",
  "Pending",
  "Confirmed",
  "Completed",
  "Rejected",
  "Cancelled",
];

// ─── Status badge colours ─────────────────────────────────────────────────────

const STATUS_BADGE: Record<UiAppointment["status"], string> = {
  Pending: "bg-amber-50 text-amber-600",
  Confirmed: "bg-emerald-50 text-emerald-600",
  Completed: "bg-slate-100 text-slate-500",
  Rejected: "bg-rose-50 text-rose-500",
  Cancelled: "bg-slate-100 text-slate-500",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingsClient({
  bookings,
  initialStatus = "All",
}: {
  bookings: UiAppointment[];
  initialStatus?: string;
}) {
  const [filter, setFilter] = useState<FilterOption>(
    FILTERS.includes(initialStatus as FilterOption)
      ? (initialStatus as FilterOption)
      : "All",
  );
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newBookingOpen, setNewBookingOpen] = useState(false);

  const visible = useMemo(
    () =>
      bookings.filter(
        (b) =>
          (filter === "All" || b.status === filter) &&
          b.patient.toLowerCase().includes(query.toLowerCase()),
      ),
    [filter, query, bookings],
  );

  return (
    <>
      {/* ── Filter / Search / New Booking bar ── */}
      <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        {/* Status filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${
                filter === item
                  ? "bg-brand text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Search + New booking */}
        <div className="flex shrink-0 items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-slate-400 sm:w-56">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none"
              placeholder="Search patient…"
            />
          </label>

          <button
            onClick={() => setNewBookingOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <CalendarPlus size={18} />
            <span className="hidden sm:inline">New booking</span>
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        {/* Desktop header row */}
        <div className="hidden grid-cols-[1.6fr_1.1fr_1.25fr_0.9fr_36px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 lg:grid">
          <span>Patient</span>
          <span>Date</span>
          <span>Reason</span>
          <span>Status</span>
          <span />
        </div>

        <div className="divide-y divide-slate-100">
          {visible.map((booking) => (
            <article
              key={booking.id}
              className="grid cursor-pointer gap-3 px-5 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.6fr_1.1fr_1.25fr_0.9fr_36px] lg:items-center lg:gap-4 lg:px-6"
              onClick={() => setSelectedId(booking.id)}
            >
              {/* Patient column */}
              <div className="flex items-center gap-3">
                <AppointmentAvatar
                  initials={booking.initials}
                  color={booking.color}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {booking.patient}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {booking.id} · {booking.age} yrs
                  </p>
                </div>
              </div>

              {/* Date column */}
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarDays size={15} className="text-brand" />
                {booking.date ?? "Today"} · {booking.time}
              </p>

              {/* Reason column */}
              <p className="text-sm text-slate-500">{booking.reason}</p>

              {/* Status badge */}
              <span
                className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[booking.status]}`}
              >
                {booking.status}
              </span>

              {/* More options — also opens the detail drawer */}
              <button
                aria-label={`View details for ${booking.patient}`}
                className="text-slate-400 hover:text-slate-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(booking.id);
                }}
              >
                <MoreHorizontal size={20} />
              </button>
            </article>
          ))}

          {visible.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-slate-400">
              No appointments found.
            </p>
          )}
        </div>
      </section>

      {/* ── Drawers ── */}
      <AppointmentDetail
        appointmentId={selectedId}
        onClose={() => setSelectedId(null)}
      />
      <NewBookingDrawer
        open={newBookingOpen}
        onClose={() => setNewBookingOpen(false)}
      />
    </>
  );
}
