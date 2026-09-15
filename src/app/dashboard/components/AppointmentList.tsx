import { ArrowUpRight, CalendarDays, Clock3 } from "lucide-react";
import type { Appointment } from "../types";
import { AppointmentAvatar } from "./AppointmentAvatar";

const todayLabel = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

export function AppointmentList({
  title,
  appointments,
  upcoming = false,
}: {
  title: string;
  appointments: Appointment[];
  upcoming?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {upcoming ? "Your next scheduled visits" : todayLabel}
          </p>
        </div>
        <button className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
          View all <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="space-y-2">
        {appointments.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            No appointments to show.
          </p>
        )}
        {appointments.map((appointment) => (
          <article
            key={appointment.id}
            className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50"
          >
            <AppointmentAvatar
              initials={appointment.initials}
              color={appointment.color}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-700">
                {appointment.patient}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {appointment.reason}
              </p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-600">
                {upcoming ? (
                  <CalendarDays size={13} className="text-brand" />
                ) : (
                  <Clock3 size={13} className="text-brand" />
                )}
                {upcoming ? appointment.date : appointment.time}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {upcoming ? appointment.time : appointment.status}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
