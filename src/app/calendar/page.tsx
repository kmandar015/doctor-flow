import { listAppointments } from "@/lib/database/appointments";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { deriveColor, deriveInitials } from "@/lib/appointments/view-models";
import { CalendarClient } from "./components/CalendarClient";
import { getDoctorAvailability } from "@/lib/database/availability";

export default function CalendarPage() {
  const doctorId = getCurrentDoctorId();
  const raw = listAppointments(doctorId);
  const availability = getDoctorAvailability(doctorId) || {
    doctorId,
    workingDays: [1, 2, 3, 4, 5],
    workStart: "09:00",
    workEnd: "17:00",
    breakStart: null,
    breakEnd: null,
    slotDuration: 30,
  };

  // Pass only the fields CalendarClient needs; filter to active statuses.
  const appointments = raw
    .filter((a) => a.status === "CONFIRMED" || a.status === "PENDING")
    .map((a) => ({
      id: a.id,
      date: a.appointmentDate,
      time: a.appointmentTime,
      patient: a.patient.name,
      initials: deriveInitials(a.patient.name),
      color: deriveColor(a.patient.name),
      status: a.status as "CONFIRMED" | "PENDING",
      reason: a.reason ?? "General consultation",
    }));

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="pt-8 md:pt-0">
        <p className="text-sm font-medium text-brand">Schedule</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
          Calendar
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          See your availability and upcoming consultations.
        </p>
      </div>
      <CalendarClient appointments={appointments} availability={availability} />
    </main>
  );
}
