import { CalendarDays, ChevronRight } from "lucide-react";
import { CLINIC_TIME_ZONE, currentTimeHHMM, endOfMonthISO, todayISO } from "@/lib/dates";
import { getDashboardSummary } from "@/lib/database/appointments";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { getDoctorById } from "@/lib/database/doctors";
import { getAppointmentStats, getPatientStats, getFollowUpStats } from "@/lib/database/reports";
import { toUiAppointment } from "@/lib/appointments/view-models";
import Link from "next/link";
import { NewBookingButton } from "../components/NewBookingLauncher";
import { DashboardAppointmentsSection } from "./components/DashboardAppointmentsSection";
import { PendingRequests } from "./components/PendingRequests";
import { StatsCards } from "./components/StatsCards";
import { FollowUpSummary } from "./components/FollowUpSummary";
import { ReportSummary } from "./components/ReportSummary";
import { AutoRefresh } from "@/app/components/AutoRefresh";
import type { Stat } from "./types";
import { listFollowUps } from "@/lib/database/followUps";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const doctorId = (await getCurrentDoctorId());
  const doctorName = getDoctorById(doctorId)?.name ?? "Doctor";
  const { appointments, patientsCount, stats } = getDashboardSummary(doctorId);
  const followUps = listFollowUps(doctorId);

  const today = todayISO();

  // Monthly report stats for dashboard summary
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = endOfMonthISO(today);
  const monthAppointments = getAppointmentStats(doctorId, monthStart, monthEnd);
  const monthPatients = getPatientStats(doctorId, monthStart, monthEnd);
  const monthFollowUps = getFollowUpStats(doctorId, monthStart, monthEnd);

  const todaysAppointments = appointments
    .filter((a) => a.appointmentDate === today && a.status !== "PENDING")
    .map(toUiAppointment);

  const pendingRequests = appointments
    .filter((a) => a.status === "PENDING")
    .map(toUiAppointment);

  const upcomingAppointments = appointments
    .filter((a) => a.appointmentDate > today && a.status === "CONFIRMED")
    .map(toUiAppointment);

  const statCards: Stat[] = [
    {
      label: "Today's Appointments",
      value: String(stats.today).padStart(2, "0"),
      detail: "Scheduled for today",
      trend: stats.today > 0 ? `${stats.today} today` : "None today",
      icon: "calendar",
      tone: "teal",
    },
    {
      label: "Pending Requests",
      value: String(stats.pending).padStart(2, "0"),
      detail: "Require your attention",
      trend: stats.pending > 0 ? "New" : "All clear",
      icon: "clock",
      tone: "amber",
    },
    {
      label: "Completed",
      value: String(stats.completed).padStart(2, "0"),
      detail: "Total completed appointments",
      trend: `${stats.completed} done`,
      icon: "check",
      tone: "violet",
    },
    {
      label: "Total Patients",
      value: String(patientsCount),
      detail: "Active patient records",
      trend: `${patientsCount} total`,
      icon: "users",
      tone: "blue",
    },
  ];

  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: CLINIC_TIME_ZONE,
  }).format(new Date());

  const hour = Number(currentTimeHHMM().slice(0, 2));
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="pt-8 md:pt-0">
          <p className="mb-2 text-sm font-medium text-brand">
            {todayFormatted}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
            {greeting}, {doctorName} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Here&apos;s a quick overview of your practice today.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/calendar"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <CalendarDays size={18} />
            View calendar
            <ChevronRight size={16} />
          </Link>
          <NewBookingButton />
        </div>
      </div>
      <AutoRefresh />

      <StatsCards stats={statCards} />

      <div className="mt-6">
        <PendingRequests
          key={pendingRequests.map((r) => r.id).join(",")}
          initialRequests={pendingRequests}
        />
      </div>

      <FollowUpSummary followUps={followUps} />

      <ReportSummary
        stats={{
          appointments: monthAppointments.total,
          completed: monthAppointments.completed,
          newPatients: monthPatients.new,
          followUps: monthFollowUps.total,
        }}
      />

      <DashboardAppointmentsSection
        todaysAppointments={todaysAppointments}
        upcomingAppointments={upcomingAppointments}
      />
    </main>
  );
}
