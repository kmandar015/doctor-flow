"use client";

import { useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";
import type { PatientWithStats } from "@/lib/database/patients";
import { useToast } from "@/app/components/ToastContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  notes: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterPatientDrawer({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (patient: PatientWithStats) => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const setField =
    (field: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field])
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required.";
    if (!form.lastName.trim()) errs.lastName = "Last name is required.";
    if (!form.phone.trim()) errs.phone = "Phone number is required.";
    return errs;
  }

  const handleClose = () => {
    setForm(emptyForm);
    setErrors({});
    setServerError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          address: form.address.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const msg = data?.error ?? "Could not register patient. Please try again.";
        if (res.status === 409) {
          setErrors((prev) => ({ ...prev, phone: msg }));
        } else {
          setServerError(msg);
        }
        showToast(msg, "error");
        return;
      }

      const data = (await res.json()) as { patient: PatientWithStats };
      showToast(`${data.patient.name} has been registered.`);
      setForm(emptyForm);
      setErrors({});
      onSuccess(data.patient);
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/30"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Register new patient"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-brand" />
            <h2 className="font-bold text-slate-800">Register Patient</h2>
          </div>
          <button
            onClick={handleClose}
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
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First name *" error={errors.firstName}>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={setField("firstName")}
                  placeholder="e.g. Aarav"
                  className={inputCls(!!errors.firstName)}
                  autoComplete="given-name"
                />
              </FormField>
              <FormField label="Last name *" error={errors.lastName}>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={setField("lastName")}
                  placeholder="e.g. Mehta"
                  className={inputCls(!!errors.lastName)}
                  autoComplete="family-name"
                />
              </FormField>
            </div>

            <FormField label="Phone *" error={errors.phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={setField("phone")}
                placeholder="e.g. +91 98765 42618"
                className={inputCls(!!errors.phone)}
                autoComplete="tel"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                value={form.email}
                onChange={setField("email")}
                placeholder="optional"
                className={inputCls(false)}
                autoComplete="email"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date of birth">
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={setField("dateOfBirth")}
                  className={inputCls(false)}
                />
              </FormField>
              <FormField label="Gender">
                <select
                  value={form.gender}
                  onChange={setField("gender")}
                  className={inputCls(false)}
                >
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>
            </div>

            <FormField label="Address">
              <input
                type="text"
                value={form.address}
                onChange={setField("address")}
                placeholder="optional"
                className={inputCls(false)}
                autoComplete="street-address"
              />
            </FormField>

            <FormField label="Notes">
              <textarea
                value={form.notes}
                onChange={setField("notes")}
                placeholder="Allergies, conditions, or other notes…"
                rows={3}
                className={`${inputCls(false)} resize-none`}
              />
            </FormField>

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
                onClick={handleClose}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {isPending ? "Registering…" : "Register Patient"}
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
