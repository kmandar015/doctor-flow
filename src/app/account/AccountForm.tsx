"use client";

import { Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/app/components/ToastContext";
import type { Doctor } from "@/lib/database/types";

type Field = "name" | "phone" | "specialization" | "clinicName";

const fields: Array<{ key: Field; label: string; autoComplete?: string }> = [
  { key: "name", label: "Full name", autoComplete: "name" },
  { key: "phone", label: "Phone number", autoComplete: "tel" },
  { key: "specialization", label: "Speciality" },
  { key: "clinicName", label: "Clinic name", autoComplete: "organization" },
];

export function AccountForm({ doctor }: { doctor: Doctor }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState<Record<Field, string>>({
    name: doctor.name,
    phone: doctor.phone,
    specialization: doctor.specialization,
    clinicName: doctor.clinicName,
  });
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setServerError("");
    startTransition(async () => {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setServerError(data?.error ?? "Could not save your profile.");
        return;
      }
      showToast("Profile saved.");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-brand">
          <Stethoscope size={20} />
        </span>
        <div>
          <h2 className="font-bold text-slate-800">Profile details</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Shown in WhatsApp messages to your patients
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, autoComplete }) => (
          <label
            key={key}
            className="text-xs font-bold uppercase tracking-wide text-slate-400"
          >
            {label}
            <input
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              autoComplete={autoComplete}
              required
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-brand"
            />
          </label>
        ))}
        <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Email address
          <input
            value={doctor.email}
            readOnly
            className="mt-2 w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-500 outline-none"
          />
        </label>
      </div>
      {serverError && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600"
        >
          {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="mt-6 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
