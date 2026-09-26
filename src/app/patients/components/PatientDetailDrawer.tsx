"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { PatientWithStats } from "@/lib/database/patients";
import { AppointmentAvatar } from "@/app/dashboard/components/AppointmentAvatar";
import {
  deriveColor,
  deriveInitials,
  formatDate,
} from "@/lib/appointments/view-models";

export function PatientDetailDrawer({
  patientId,
  onClose,
}: {
  patientId: string;
  onClose: () => void;
}) {
  const [patient, setPatient] = useState<PatientWithStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = !patient && !error;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPatient(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    fetch(`/api/patients/${patientId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not-found");
        return res.json() as Promise<{ patient: PatientWithStats }>;
      })
      .then(({ patient: data }) => {
        if (!cancelled) setPatient(data);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load patient.");
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Patient details"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-bold text-slate-800">Patient Details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <p className="py-16 text-center text-sm text-slate-400">Loading…</p>
          )}
          {error && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle size={32} className="text-slate-300" />
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          )}
          {patient && (
            <>
              <div className="flex items-center gap-4">
                <AppointmentAvatar
                  initials={deriveInitials(patient.name)}
                  color={deriveColor(patient.name)}
                  size="md"
                />
                <div>
                  <p className="font-bold text-slate-800">{patient.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {patient.totalAppointments}{" "}
                    {patient.totalAppointments === 1
                      ? "appointment"
                      : "appointments"}
                  </p>
                </div>
              </div>

              <section className="mt-5 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Contact & Info
                </p>
                <InfoRow label="Phone" value={patient.phone} />
                {patient.email && (
                  <InfoRow label="Email" value={patient.email} />
                )}
                {patient.dateOfBirth && (
                  <InfoRow
                    label="Date of birth"
                    value={formatDate(patient.dateOfBirth)}
                  />
                )}
                {patient.gender && (
                  <InfoRow label="Gender" value={patient.gender} />
                )}
                {patient.address && (
                  <InfoRow label="Address" value={patient.address} />
                )}
              </section>

              {patient.notes && (
                <section className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Notes
                  </p>
                  <p className="text-sm text-slate-700">{patient.notes}</p>
                </section>
              )}

              <Link
                href={`/patients/${patient.id}`}
                onClick={onClose}
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
              >
                <ExternalLink size={13} />
                View full patient record
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-xs font-semibold text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-xs text-slate-700">{value}</dd>
    </div>
  );
}
