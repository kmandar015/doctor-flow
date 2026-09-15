"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, X } from "lucide-react";
import { useToast } from "./ToastContext";

// ─── Types ────────────────────────────────────────────────────────────────────

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

  if (!open) return null;

  // Generic field updater — clears the field's inline error on change
  const setField =
    (field: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  // Client-side required-field validation
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

      // On success: refresh server data, reset the form, close the drawer
      showToast("Appointment booked successfully.");
      router.refresh();
      setForm(emptyForm);
      setErrors({});
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
              <div className="space-y-3">
                <FormField label="Full name *" error={errors.patientName}>
                  <input
                    type="text"
                    value={form.patientName}
                    onChange={setField("patientName")}
                    placeholder="e.g. Aarav Mehta"
                    className={inputCls(!!errors.patientName)}
                    autoComplete="name"
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
                    <input
                      type="time"
                      value={form.appointmentTime}
                      onChange={setField("appointmentTime")}
                      className={inputCls(!!errors.appointmentTime)}
                    />
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
