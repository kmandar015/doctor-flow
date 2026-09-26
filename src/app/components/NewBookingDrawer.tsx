"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Search, X } from "lucide-react";
import { useToast } from "./ToastContext";
import type { PatientWithStats } from "@/lib/database/patients";

// ─── Types ────────────────────────────────────────────────────────────────────

type PatientMode = "search" | "new";

type FormState = {
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  patientDob: string;
  patientGender: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  notes: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = {
  patientName: "",
  patientPhone: "",
  patientEmail: "",
  patientDob: "",
  patientGender: "",
  appointmentDate: "",
  appointmentTime: "",
  reason: "",
  notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function NewBookingDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Patient search state
  const [patientMode, setPatientMode] = useState<PatientMode>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientWithStats[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithStats | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!open) return null;

  // ── Patient search debounce ──────────────────────────────────────────────

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/patients?search=${encodeURIComponent(q)}`)
        .then((res) => res.json() as Promise<{ patients: PatientWithStats[] }>)
        .then(({ patients }) => setSearchResults(patients))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 300);
  };

  const handleSelectPatient = (patient: PatientWithStats) => {
    setSelectedPatient(patient);
    setSearchQuery("");
    setSearchResults([]);
    // Pre-fill form fields from existing patient
    setForm((prev) => ({
      ...prev,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientEmail: patient.email ?? "",
      patientDob: patient.dateOfBirth ?? "",
      patientGender: patient.gender ?? "",
    }));
    setErrors({});
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setForm((prev) => ({
      ...prev,
      patientName: "",
      patientPhone: "",
      patientEmail: "",
      patientDob: "",
      patientGender: "",
    }));
  };

  // ── Form helpers ──────────────────────────────────────────────────────────

  const setField =
    (field: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));

      if (field === "appointmentDate") {
        setForm((prev) => ({ ...prev, appointmentTime: "" }));
        setLoadingSlots(true);
        fetch(`/api/availability/slots?date=${e.target.value}`)
          .then((res) => res.json())
          .then((data) => {
            setAvailableSlots((data as { slots?: string[] }).slots ?? []);
          })
          .catch(() => setAvailableSlots([]))
          .finally(() => setLoadingSlots(false));
      }
    };

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.patientName.trim()) errs.patientName = "Name is required.";
    if (!form.patientPhone.trim()) errs.patientPhone = "Phone is required.";
    if (!form.appointmentDate) errs.appointmentDate = "Date is required.";
    if (!form.appointmentTime) errs.appointmentTime = "Time is required.";
    return errs;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: {
            name: form.patientName.trim(),
            phone: form.patientPhone.trim(),
            email: form.patientEmail.trim() || undefined,
            dateOfBirth: form.patientDob || undefined,
            gender: form.patientGender || undefined,
          },
          appointmentDate: form.appointmentDate,
          appointmentTime: form.appointmentTime,
          reason: form.reason.trim() || undefined,
          notes: form.notes.trim() || undefined,
          source: "DASHBOARD",
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const msg =
          data?.error ?? "Could not create appointment. Please try again.";
        setServerError(msg);
        showToast(msg, "error");
        return;
      }

      showToast("Appointment booked successfully.");
      router.refresh();
      setForm(emptyForm);
      setErrors({});
      setSelectedPatient(null);
      setPatientMode("search");
      setSearchQuery("");
      onClose();
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="New booking"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarPlus size={18} className="text-brand" />
            <h2 className="font-bold text-slate-800">New Booking</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* ── Patient ── */}
            <fieldset>
              <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Patient
              </legend>

              {/* Mode toggle */}
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPatientMode("search");
                    handleClearPatient();
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    patientMode === "search"
                      ? "bg-brand text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Search existing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPatientMode("new");
                    handleClearPatient();
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    patientMode === "new"
                      ? "bg-brand text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  + New patient
                </button>
              </div>

              {/* Search mode */}
              {patientMode === "search" && !selectedPatient && (
                <div className="relative">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <Search size={16} className="shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search by name or phone…"
                      className="w-full bg-transparent text-sm text-slate-700 outline-none"
                    />
                  </label>
                  {(searchResults.length > 0 || isSearching) && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                      {isSearching && (
                        <p className="px-4 py-3 text-xs text-slate-400">
                          Searching…
                        </p>
                      )}
                      {!isSearching &&
                        searchResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPatient(p)}
                            className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl"
                          >
                            <span className="font-semibold text-slate-700">
                              {p.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {p.phone}
                            </span>
                          </button>
                        ))}
                      {!isSearching && searchResults.length === 0 && searchQuery.trim() && (
                        <p className="px-4 py-3 text-xs text-slate-400">
                          No patients found.
                        </p>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Or switch to &quot;+ New patient&quot; to register a walk-in.
                  </p>
                </div>
              )}

              {/* Selected patient card */}
              {patientMode === "search" && selectedPatient && (
                <div className="flex items-start justify-between rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {selectedPatient.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedPatient.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearPatient}
                    className="ml-3 text-xs font-semibold text-rose-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* New patient fields OR hidden pre-filled fields for search */}
              {(patientMode === "new" || selectedPatient) && (
                <div className="mt-3 space-y-3">
                  <FormField label="Full name *" error={errors.patientName}>
                    <input
                      type="text"
                      value={form.patientName}
                      onChange={setField("patientName")}
                      placeholder="e.g. Aarav Mehta"
                      className={inputCls(!!errors.patientName)}
                      autoComplete="name"
                      readOnly={!!selectedPatient}
                    />
                  </FormField>

                  <FormField label="Phone *" error={errors.patientPhone}>
                    <input
                      type="tel"
                      value={form.patientPhone}
                      onChange={setField("patientPhone")}
                      placeholder="e.g. 9876543210"
                      className={inputCls(!!errors.patientPhone)}
                      autoComplete="tel"
                      readOnly={!!selectedPatient}
                    />
                  </FormField>

                  <FormField label="Email">
                    <input
                      type="email"
                      value={form.patientEmail}
                      onChange={setField("patientEmail")}
                      placeholder="optional"
                      className={inputCls(false)}
                      autoComplete="email"
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Date of birth">
                      <input
                        type="date"
                        value={form.patientDob}
                        onChange={setField("patientDob")}
                        className={inputCls(false)}
                      />
                    </FormField>

                    <FormField label="Gender">
                      <select
                        value={form.patientGender}
                        onChange={setField("patientGender")}
                        className={inputCls(false)}
                      >
                        <option value="">Select…</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </FormField>
                  </div>
                </div>
              )}
            </fieldset>

            {/* ── Appointment ── */}
            <fieldset>
              <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Appointment
              </legend>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Date *" error={errors.appointmentDate}>
                    <input
                      type="date"
                      value={form.appointmentDate}
                      onChange={setField("appointmentDate")}
                      className={inputCls(!!errors.appointmentDate)}
                    />
                  </FormField>

                  <FormField label="Time *" error={errors.appointmentTime}>
                    <select
                      value={form.appointmentTime}
                      onChange={setField("appointmentTime")}
                      className={inputCls(!!errors.appointmentTime)}
                      disabled={!form.appointmentDate || loadingSlots}
                    >
                      <option value="">
                        {loadingSlots ? "Loading..." : "Select time"}
                      </option>
                      {availableSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <FormField label="Reason">
                  <input
                    type="text"
                    value={form.reason}
                    onChange={setField("reason")}
                    placeholder="e.g. General consultation"
                    className={inputCls(false)}
                  />
                </FormField>

                <FormField label="Notes">
                  <textarea
                    value={form.notes}
                    onChange={setField("notes")}
                    placeholder="Additional notes…"
                    rows={3}
                    className={`${inputCls(false)} resize-none`}
                  />
                </FormField>
              </div>
            </fieldset>

            {serverError && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600"
              >
                {serverError}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-6 py-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {isPending ? "Booking…" : "Book appointment"}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = (hasError: boolean) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-brand/30 ${
    hasError ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
  }`;

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
