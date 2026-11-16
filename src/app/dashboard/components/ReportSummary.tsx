import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  UserPlus,
  ClipboardCheck,
} from "lucide-react";

type MonthlyStats = {
  appointments: number;
  completed: number;
  newPatients: number;
  followUps: number;
};

export function ReportSummary({ stats }: { stats: MonthlyStats }) {
  const items = [
    {
      icon: CalendarDays,
      label: "Appointments",
      value: stats.appointments,
      bg: "bg-teal-50 text-brand",
    },
    {
      icon: CheckCircle2,
      label: "Completed",
      value: stats.completed,
      bg: "bg-green-50 text-green-600",
    },
    {
      icon: UserPlus,
      label: "New Patients",
      value: stats.newPatients,
      bg: "bg-blue-50 text-blue-600",
    },
    {
      icon: ClipboardCheck,
      label: "Follow-ups",
      value: stats.followUps,
      bg: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold tracking-tight text-slate-800">
          <BarChart3 size={18} className="text-brand" />
          This Month
        </h2>
        <Link
          href="/reports"
          className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          View Reports
          <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, label, value, bg }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${bg}`}
            >
              <Icon size={16} />
            </span>
            <div>
              <p className="text-lg font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
