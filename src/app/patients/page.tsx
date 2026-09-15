import { listPatients } from "@/lib/database/appointments";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { toUiPatient } from "@/lib/appointments/view-models";
import { PatientsClient } from "./components/PatientsClient";

export default function PatientsPage() {
  const patients = listPatients(getCurrentDoctorId()).map(toUiPatient);

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="pt-8 md:pt-0">
        <p className="text-sm font-medium text-brand">Patient records</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
          Patients
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Keep the details and history of everyone you care for.
        </p>
      </div>
      <PatientsClient patients={patients} />
    </main>
  );
}
