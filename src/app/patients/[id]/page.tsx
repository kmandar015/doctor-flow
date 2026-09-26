import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getPatientById,
  listPatientsWithStats,
  getPatientAppointments,
} from "@/lib/database/patients";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { AppointmentAvatar } from "@/app/dashboard/components/AppointmentAvatar";
import {
  deriveColor,
  deriveInitials,
  formatDate,
} from "@/lib/appointments/view-models";
import { PatientDetailClient } from "./components/PatientDetailClient";
import { getPatientFollowUps } from "@/lib/database/followUps";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doctorId = getCurrentDoctorId();

  const patient = getPatientById(doctorId, id);
  if (!patient) notFound();

  // Get patient with stats for the header badge (patient is non-null here)
  const withStats = listPatientsWithStats(doctorId).find((p) => p.id === id);
  const appointments = getPatientAppointments(doctorId, id);

  const initials = deriveInitials(patient.name);
  const color = deriveColor(patient.name);
  const totalAppointments = withStats?.totalAppointments ?? 0;

  return (
    <main className="mx-auto max-w-[900px] px-5 py-8 sm:px-8 lg:px-10">
      {/* Back link */}
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={16} />
        Patients
      </Link>

      {/* Patient header */}
      <div className="mt-6 flex items-center gap-5">
        <AppointmentAvatar initials={initials} color={color} size="md" />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              {patient.name}
            </h1>
            <span className="rounded-full bg-teal-50 px-3 py-0.5 text-xs font-bold text-brand">
              {totalAppointments}{" "}
              {totalAppointments === 1 ? "appointment" : "appointments"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {patient.gender ?? "—"}
            {patient.dateOfBirth
              ? ` · DOB ${formatDate(patient.dateOfBirth)}`
              : ""}
          </p>
        </div>
      </div>

      {/* Client component handles editable notes + appointment history */}
      <PatientDetailClient
        patient={patient}
        initialAppointments={appointments}
        initialFollowUps={getPatientFollowUps(doctorId, id)}
      />
    </main>
  );
}
