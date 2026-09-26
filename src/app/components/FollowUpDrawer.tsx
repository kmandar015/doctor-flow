"use client";

import { useState } from "react";
import { X, Calendar as CalendarIcon, FileText } from "lucide-react";
import { useToast } from "@/app/components/ToastContext";
import type { Patient } from "@/lib/database/types";

export function FollowUpDrawer({
  open,
  onClose,
  patient,
  appointmentId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  patient: Patient;
  appointmentId?: string;
  onSuccess?: () => void;
}) {
  const { showToast } = useToast();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          appointmentId,
          followUpDate: date,
          reason,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create follow-up");
      }

      showToast("Follow-up saved successfully.");
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

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
        aria-label="Add Follow-up"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-bold text-slate-800">Add Follow-up</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form
            id="followup-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Patient</p>
              <p className="text-sm text-slate-500">{patient.name}</p>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CalendarIcon size={16} />
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText size={16} />
                Reason
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Follow-up consultation"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>
          </form>
        </div>

        <div className="border-t border-slate-100 p-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="followup-form"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save Follow-up"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
