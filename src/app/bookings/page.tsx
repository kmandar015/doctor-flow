import { listAppointments } from "@/lib/database/appointments";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { toUiAppointment } from "@/lib/appointments/view-models";
import { BookingsClient } from "./components/BookingsClient";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const initialStatus = resolvedParams.status as string | undefined;

  const bookings = listAppointments(getCurrentDoctorId()).map(toUiAppointment);
  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="pt-8 md:pt-0">
        <p className="text-sm font-medium text-brand">Appointments</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
          Bookings
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage and review all patient appointment requests.
        </p>
      </div>
      <BookingsClient bookings={bookings} initialStatus={initialStatus} />
    </main>
  );
}
