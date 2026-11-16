"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReportResponse, TrendPoint } from "@/lib/database/reports";
import { todayISO, toISODate } from "@/lib/dates";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Users,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Download,
  RefreshCw,
  BarChart3,
  UserPlus,
  ClipboardCheck,
} from "lucide-react";

// ─── Date Range Helpers ───────────────────────────────────────────────────────

type RangePreset = "today" | "this_week" | "this_month" | "last_month" | "custom";

function getPresetRange(preset: RangePreset): { from: string; to: string } {
  const [year, month, day] = todayISO().split("-").map(Number);
  const today = new Date(year, month - 1, day);
  const fmt = toISODate;

  switch (preset) {
    case "today":
      return { from: fmt(today), to: fmt(today) };
    case "this_week": {
      const day = today.getDay(); // 0 = Sunday
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: fmt(monday), to: fmt(sunday) };
    }
    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: fmt(start), to: fmt(end) };
    }
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: fmt(start), to: fmt(end) };
    }
    default:
      return { from: fmt(today), to: fmt(today) };
  }
}

const presetLabels: Record<RangePreset, string> = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  custom: "Custom Range",
};

// ─── Simple Bar Chart ─────────────────────────────────────────────────────────

function MiniBarChart({
  data,
  label,
  color,
}: {
  data: TrendPoint[];
  label: string;
  color: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        No {label.toLowerCase()} data for this period.
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
        <span className="text-xs text-slate-400">
          {data.length} {data.length === 1 ? "day" : "days"}
        </span>
      </div>
      <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: 120 }}>
        {data.map((point) => {
          const height = Math.max((point.count / maxCount) * 100, 4);
          const dateLabel = new Date(`${point.date}T00:00:00`).toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short" },
          );
          return (
            <div
              key={point.date}
              className="group flex shrink-0 flex-col items-center"
              style={{ minWidth: data.length > 14 ? 28 : 40 }}
            >
              <span className="mb-1 text-[10px] font-semibold text-slate-600 opacity-0 transition group-hover:opacity-100">
                {point.count}
              </span>
              <div
                className="w-full rounded-t-md transition-all group-hover:opacity-80"
                style={{
                  height: `${height}px`,
                  backgroundColor: color,
                  minWidth: 12,
                  maxWidth: 32,
                }}
                title={`${dateLabel}: ${point.count}`}
              />
              <span
                className="mt-1.5 text-[10px] text-slate-400"
                style={{
                  writingMode: data.length > 10 ? "vertical-rl" : undefined,
                  transform: data.length > 10 ? "rotate(180deg)" : undefined,
                }}
              >
                {dateLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(report: ReportResponse, from: string, to: string) {
  const lines: string[] = [];
  lines.push("DoctorFlow Report");
  lines.push(`Period: ${from} to ${to}`);
  lines.push("");

  lines.push("Appointment Statistics");
  lines.push("Metric,Value");
  lines.push(`Total Appointments,${report.appointments.total}`);
  lines.push(`Completed,${report.appointments.completed}`);
  lines.push(`Confirmed,${report.appointments.confirmed}`);
  lines.push(`Pending,${report.appointments.pending}`);
  lines.push(`Cancelled,${report.appointments.cancelled}`);
  lines.push(`Completion Rate,${report.appointments.completionRate}%`);
  lines.push(`Cancellation Rate,${report.appointments.cancellationRate}%`);
  lines.push("");

  lines.push("Patient Statistics");
  lines.push("Metric,Value");
  lines.push(`Total Patients,${report.patients.total}`);
  lines.push(`New Patients,${report.patients.new}`);
  lines.push(`Returning Patients,${report.patients.returning}`);
  lines.push("");

  lines.push("Follow-Up Statistics");
  lines.push("Metric,Value");
  lines.push(`Total Follow-ups,${report.followUps.total}`);
  lines.push(`Pending,${report.followUps.pending}`);
  lines.push(`Completed,${report.followUps.completed}`);
  lines.push(`Cancelled,${report.followUps.cancelled}`);
  lines.push(`Current Overdue,${report.followUps.overdue}`);
  lines.push(`Completion Rate,${report.followUps.completionRate}%`);
  lines.push("");

  if (report.trends.appointments.length > 0) {
    lines.push("Appointment Trend");
    lines.push("Date,Appointments");
    for (const p of report.trends.appointments) {
      lines.push(`${p.date},${p.count}`);
    }
    lines.push("");
  }

  if (report.trends.newPatients.length > 0) {
    lines.push("New Patient Trend");
    lines.push("Date,New Patients");
    for (const p of report.trends.newPatients) {
      lines.push(`${p.date},${p.count}`);
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `doctorflow-report-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportsClient() {
  const [preset, setPreset] = useState<RangePreset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  // Bumped by the Refresh / Try again buttons to re-run the fetch.
  const [reloadToken, setReloadToken] = useState(0);
  // The last finished request. Loading is derived by comparing its key with
  // the current one, so the effect never sets state synchronously.
  const [result, setResult] = useState<{
    key: string;
    report: ReportResponse | null;
    error: string | null;
  } | null>(null);

  const getRange = useCallback(() => {
    if (preset === "custom") {
      return { from: customFrom, to: customTo };
    }
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  const { from, to } = getRange();
  const requestKey = `${from}|${to}|${reloadToken}`;

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/reports?from=${from}&to=${to}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? "Failed to load reports.",
          );
        }
        const data = (await res.json()) as ReportResponse;
        if (!cancelled) setResult({ key: requestKey, report: data, error: null });
      } catch (err: unknown) {
        if (!cancelled) {
          setResult({
            key: requestKey,
            report: null,
            error:
              err instanceof Error
                ? err.message
                : "Unable to load reports. Please try again.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [from, to, requestKey]);

  const isLoading = Boolean(from && to) && result?.key !== requestKey;
  const report = result?.report ?? null;
  const error = result?.error ?? null;
  const fetchReport = () => setReloadToken((n) => n + 1);
  const hasActivity =
    report &&
    (report.appointments.total > 0 ||
      report.patients.new > 0 ||
      report.followUps.total > 0);

  return (
    <>
      {/* Date Range Filter */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(presetLabels) as RangePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPreset(p);
                if (p === "custom" && !customFrom) {
                  const range = getPresetRange("this_month");
                  setCustomFrom(range.from);
                  setCustomTo(range.to);
                }
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                preset === p
                  ? "bg-brand text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {presetLabels[p]}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
            />
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => void fetchReport()}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          {report && (
            <button
              onClick={() => exportCSV(report, from, to)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
            >
              <Download size={14} />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-10 flex flex-col items-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand" />
          <p className="text-sm text-slate-400">Loading reports...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 py-16">
          <XCircle size={32} className="text-rose-400" />
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          <button
            onClick={() => void fetchReport()}
            className="mt-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && report && !hasActivity && (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white py-16 shadow-card">
          <BarChart3 size={36} className="text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">
            No activity for this period.
          </p>
          <p className="text-xs text-slate-400">
            Select a different date range to view reports.
          </p>
        </div>
      )}

      {/* Report Content */}
      {!isLoading && !error && report && hasActivity && (
        <>
          {/* Summary Cards */}
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              icon={CalendarDays}
              label="Total Appointments"
              value={report.appointments.total}
              tone="teal"
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Completed"
              value={report.appointments.completed}
              tone="green"
            />
            <SummaryCard
              icon={Clock3}
              label="Confirmed"
              value={report.appointments.confirmed}
              tone="blue"
            />
            <SummaryCard
              icon={Clock3}
              label="Pending"
              value={report.appointments.pending}
              tone="amber"
            />
            <SummaryCard
              icon={XCircle}
              label="Cancelled"
              value={report.appointments.cancelled}
              tone="rose"
            />
          </section>

          {/* Appointment Statistics */}
          <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-bold tracking-tight text-slate-800">
              <BarChart3 size={18} className="text-brand" />
              Appointment Statistics
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatRow label="Total" value={String(report.appointments.total)} />
              <StatRow label="Completed" value={String(report.appointments.completed)} />
              <StatRow label="Confirmed" value={String(report.appointments.confirmed)} />
              <StatRow label="Pending" value={String(report.appointments.pending)} />
              <StatRow label="Cancelled" value={String(report.appointments.cancelled)} />
              <StatRow label="Completion Rate" value={`${report.appointments.completionRate}%`} />
              <StatRow
                label="Cancellation Rate"
                value={`${report.appointments.cancellationRate}%`}
              />
            </div>
          </section>

          {/* Appointment Trend */}
          <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-bold tracking-tight text-slate-800">
              <TrendingUp size={18} className="text-brand" />
              Appointment Trend
            </h2>
            <MiniBarChart
              data={report.trends.appointments}
              label="Appointments"
              color="#18736E"
            />
          </section>

          {/* Patient Statistics */}
          <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-bold tracking-tight text-slate-800">
              <Users size={18} className="text-brand" />
              Patient Statistics
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatRow label="Total Patients" value={String(report.patients.total)} />
              <StatRow label="New Patients" value={String(report.patients.new)} />
              <StatRow label="Returning Patients" value={String(report.patients.returning)} />
            </div>
          </section>

          {/* Patient Growth */}
          <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-bold tracking-tight text-slate-800">
              <UserPlus size={18} className="text-brand" />
              Patient Growth
            </h2>
            <MiniBarChart
              data={report.trends.newPatients}
              label="New Patients"
              color="#6366F1"
            />
          </section>

          {/* Follow-Up Statistics */}
          <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-bold tracking-tight text-slate-800">
              <ClipboardCheck size={18} className="text-brand" />
              Follow-Up Statistics
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatRow label="Total Follow-ups" value={String(report.followUps.total)} />
              <StatRow label="Pending" value={String(report.followUps.pending)} />
              <StatRow label="Completed" value={String(report.followUps.completed)} />
              <StatRow label="Cancelled" value={String(report.followUps.cancelled)} />
              <StatRow label="Completion Rate" value={`${report.followUps.completionRate}%`} />
            </div>
            <div className="mt-4 rounded-xl bg-orange-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-600" />
                <span className="text-sm font-semibold text-orange-700">
                  Current Overdue Follow-ups
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold text-orange-800">
                {report.followUps.overdue}
              </p>
              <p className="mt-0.5 text-xs text-orange-600">
                Pending follow-ups past their scheduled date (real-time, not
                range-scoped)
              </p>
            </div>
          </section>
        </>
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Tone = "teal" | "green" | "blue" | "amber" | "rose";

const toneStyles: Record<Tone, string> = {
  teal: "bg-teal-50 text-brand",
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  value: number;
  tone: Tone;
}) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <span
        className={`grid h-11 w-11 place-items-center rounded-xl ${toneStyles[tone]}`}
      >
        <Icon size={21} />
      </span>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-800">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-600">{label}</p>
    </article>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}
