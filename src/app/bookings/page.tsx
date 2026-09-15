import { CalendarPlus } from "lucide-react";
import { listAppointments } from "@/lib/database/appointments";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { toUiAppointment } from "@/lib/appointments/view-models";
import { BookingsClient } from "./components/BookingsClient";

export default function BookingsPage() {
  const bookings = listAppointments(getCurrentDoctorId()).map(toUiAppointment);
  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 pt-8 sm:flex-row sm:items-end sm:justify-between md:pt-0">
        <div>
          <p className="text-sm font-medium text-brand">Appointments</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
            Bookings
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage and review all patient appointment requests.
          </p>
        </div>
        <button className="inline-flex w-fit items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800">
          <CalendarPlus size={18} />
          New booking
        </button>
      </div>
      <BookingsClient bookings={bookings} />
    </main>
  );
}
