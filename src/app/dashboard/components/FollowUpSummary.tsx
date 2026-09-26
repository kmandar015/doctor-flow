import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, AlertTriangle } from "lucide-react";
import type { FollowUp } from "@/lib/database/types";

export function FollowUpSummary({ followUps }: { followUps: FollowUp[] }) {
  const today = new Date().toISOString().slice(0, 10);

  const todayCount = followUps.filter(
    (f) => f.followUpDate === today && f.status === "PENDING",
  ).length;
  const upcomingCount = followUps.filter(
    (f) => f.followUpDate > today && f.status === "PENDING",
  ).length;
  const overdueCount = followUps.filter(
    (f) => f.followUpDate < today && f.status === "PENDING",
  ).length;

  return (
    <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold tracking-tight text-slate-800">Follow-ups</h2>
        <Link
          href="/follow-ups"
          className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          View all
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/follow-ups?filter=today"
          className="group flex flex-col justify-center rounded-xl bg-slate-50 p-4 transition hover:bg-teal-50"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-brand shadow-sm">
              <CalendarDays size={16} />
            </span>
            <span className="text-sm font-semibold text-slate-600 group-hover:text-brand">
              Today
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-800">{todayCount}</p>
        </Link>

        <Link
          href="/follow-ups?filter=upcoming"
          className="group flex flex-col justify-center rounded-xl bg-slate-50 p-4 transition hover:bg-blue-50"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-blue-600 shadow-sm">
              <Clock size={16} />
            </span>
            <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-700">
              Upcoming
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {upcomingCount}
          </p>
        </Link>

        <Link
          href="/follow-ups?filter=overdue"
          className="group flex flex-col justify-center rounded-xl bg-slate-50 p-4 transition hover:bg-orange-50"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-orange-600 shadow-sm">
              <AlertTriangle size={16} />
            </span>
            <span className="text-sm font-semibold text-slate-600 group-hover:text-orange-700">
              Overdue
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-800">
            {overdueCount}
          </p>
        </Link>
      </div>
    </section>
  );
}
