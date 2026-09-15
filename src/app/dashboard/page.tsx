import { CalendarDays, ChevronRight } from "lucide-react";
import { getDashboardSummary } from "@/lib/database/appointments";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { toUiAppointment } from "@/lib/appointments/view-models";
import { AppointmentList } from "./components/AppointmentList";
import { PendingRequests } from "./components/PendingRequests";
import { StatsCards } from "./components/StatsCards";
import type { Stat } from "./types";

export default function DashboardPage() {
  const doctorId = getCurrentDoctorId();
  const { appointments, patientsCount, stats } = getDashboardSummary(doctorId);

  const today = new Date().toISOString().slice(0, 10);
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
  }).format(new Date());

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="pt-8 md:pt-0">
          <p className="mb-2 text-sm font-medium text-brand">
            {todayFormatted}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
            Good morning, Dr. Meera <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Here&apos;s a quick overview of your practice today.
          </p>
        </div>
        <button className="inline-flex w-fit items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800">
          <CalendarDays size={18} />
          View calendar
          <ChevronRight size={16} />
        </button>
      </div>
      <StatsCards stats={statCards} />
      <div className="mt-6">
        <PendingRequests initialRequests={pendingRequests} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AppointmentList
          title="Today's appointments"
          appointments={todaysAppointments}
        />
        <AppointmentList
          title="Upcoming · confirmed"
          appointments={upcomingAppointments}
          upcoming
        />
      </div>
    </main>
  );
}
