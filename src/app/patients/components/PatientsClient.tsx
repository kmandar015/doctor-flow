"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, UserPlus, MoreHorizontal } from "lucide-react";
import type { PatientWithStats } from "@/lib/database/patients";
import { AppointmentAvatar } from "@/app/dashboard/components/AppointmentAvatar";
import {
  deriveColor,
  deriveInitials,
  formatDate,
} from "@/lib/appointments/view-models";
import { RegisterPatientDrawer } from "./RegisterPatientDrawer";
import { PatientDetailDrawer } from "./PatientDetailDrawer";

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientsClient({
  patients: initialPatients,
}: {
  patients: PatientWithStats[];
}) {
  const [patients, setPatients] = useState<PatientWithStats[]>(initialPatients);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPatients = useCallback(async (search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = search.trim()
        ? `/api/patients?search=${encodeURIComponent(search)}`
        : "/api/patients";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load patients.");
      const data = (await res.json()) as { patients: PatientWithStats[] };
      setPatients(data.patients);
    } catch {
      setError("Unable to load patients. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchPatients(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchPatients]);

  const handleRegisterSuccess = (patient: PatientWithStats) => {
    setPatients((prev) =>
      [patient, ...prev].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setRegisterOpen(false);
  };

  return (
    <>
      {/* Toolbar */}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-400 shadow-sm sm:w-80">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-700 outline-none"
            placeholder="Search by patient name..."
          />
        </label>
        <button
          onClick={() => setRegisterOpen(true)}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800"
        >
          <UserPlus size={18} />
          Add patient
        </button>
      </div>

      {/* Table */}
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        {/* Header row (desktop) */}
        <div className="hidden grid-cols-[1.45fr_1fr_1.2fr_0.8fr_36px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 lg:grid">
          <span>Patient</span>
          <span>Contact</span>
          <span>Last visit</span>
          <span>Visits</span>
          <span />
        </div>

        {/* States */}
        {isLoading && (
          <p className="py-16 text-center text-sm text-slate-400">Loading…</p>
        )}

        {!isLoading && error && (
          <p className="py-16 text-center text-sm text-rose-500">{error}</p>
        )}

        {!isLoading && !error && patients.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm font-semibold text-slate-600">
              No patients found
            </p>
            <p className="text-xs text-slate-400">
              {query
                ? "Try a different search term."
                : "Register your first patient to get started."}
            </p>
          </div>
        )}

        {/* Rows */}
        {!isLoading && !error && patients.length > 0 && (
          <div className="divide-y divide-slate-100">
            {patients.map((patient) => {
              const initials = deriveInitials(patient.name);
              const color = deriveColor(patient.name);
              return (
                <article
                  key={patient.id}
                  className="grid cursor-pointer gap-3 px-5 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.45fr_1fr_1.2fr_0.8fr_36px] lg:items-center lg:gap-4 lg:px-6"
                  onClick={() => setSelectedPatientId(patient.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setSelectedPatientId(patient.id);
                  }}
                >
                  {/* Name + avatar */}
                  <div className="flex items-center gap-3">
                    <AppointmentAvatar
                      initials={initials}
                      color={color}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {patient.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {patient.gender ?? "—"}
                        {patient.dateOfBirth
                          ? ` · ${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} yrs`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <p className="text-sm text-slate-500">{patient.phone}</p>

                  {/* Last appointment */}
                  <p className="text-sm text-slate-500">
                    {patient.lastAppointment
                      ? formatDate(patient.lastAppointment)
                      : "—"}
                  </p>

                  {/* Count */}
                  <span className="text-sm font-semibold text-slate-600">
                    {patient.totalAppointments}{" "}
                    {patient.totalAppointments === 1 ? "visit" : "visits"}
                  </span>

                  {/* Arrow */}
                  <span className="text-slate-300">
                    <MoreHorizontal size={20} />
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Drawers */}
      <RegisterPatientDrawer
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSuccess={handleRegisterSuccess}
      />

      {selectedPatientId && (
        <PatientDetailDrawer
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}
    </>
  );
}
