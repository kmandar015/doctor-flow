"use client";

import { useEffect, useState } from "react";
import {
  X,
  Calendar,
  FileText,
  Ban,
  CheckCircle,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { FollowUp } from "@/lib/database/types";
import { formatDate } from "@/lib/appointments/view-models";
import { useToast } from "@/app/components/ToastContext";
import { NewBookingDrawer } from "@/app/components/NewBookingDrawer";

export function FollowUpDetailDrawer({
  followUpId,
  onClose,
}: {
  followUpId: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [bookAppointmentOpen, setBookAppointmentOpen] = useState(false);

  const loading = !followUp && !error;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/follow-ups/${followUpId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load follow-up");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setFollowUp(data.followUp);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load follow-up.");
      });
    return () => {
      cancelled = true;
    };
  }, [followUpId]);

  const handleStatusUpdate = async (status: "COMPLETED" | "CANCELLED") => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/follow-ups/${followUpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update follow-up");
      const data = await res.json();
      setFollowUp(data.followUp);
      showToast(`Follow-up marked as ${status.toLowerCase()}.`);
      if (status === "CANCELLED") setIsCancelling(false);
    } catch {
      showToast("Unable to update follow-up.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!followUpId) return null;

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
        aria-label="Follow-up details"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-bold text-slate-800">
            {isCancelling ? "Cancel Follow-up" : "Follow-up Details"}
          </h2>
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
            <p className="py-16 text-center text-sm text-rose-500">{error}</p>
          )}

          {followUp && !isCancelling && (
            <>
              <div className="mb-6">
                <p className="text-xl font-bold text-slate-800">
                  {followUp.patient?.name}
                </p>
                <Link
                  href={`/patients/${followUp.patientId}`}
                  onClick={onClose}
                  className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                >
                  <ExternalLink size={13} /> View full patient record
                </Link>
              </div>

              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <dl className="space-y-3">
                  <div className="flex gap-2">
                    <dt className="flex w-24 items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Calendar size={14} /> Date
                    </dt>
                    <dd className="text-sm font-medium text-slate-700">
                      {formatDate(followUp.followUpDate)}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="flex w-24 items-center gap-1.5 text-xs font-semibold text-slate-500">
                      Status
                    </dt>
                    <dd className="text-sm">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          followUp.status === "COMPLETED"
                            ? "bg-green-50 text-green-700"
                            : followUp.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700"
                              : followUp.followUpDate <
                                  new Date().toISOString().slice(0, 10)
                                ? "bg-orange-50 text-orange-700"
                                : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {followUp.status === "PENDING" &&
                        followUp.followUpDate <
                          new Date().toISOString().slice(0, 10)
                          ? "OVERDUE"
                          : followUp.status}
                      </span>
                    </dd>
                  </div>
                  {followUp.reason && (
                    <div className="flex gap-2">
                      <dt className="flex w-24 items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <FileText size={14} /> Reason
                      </dt>
                      <dd className="text-sm text-slate-700">
                        {followUp.reason}
                      </dd>
                    </div>
                  )}
                  {followUp.notes && (
                    <div className="flex gap-2">
                      <dt className="flex w-24 items-center gap-1.5 text-xs font-semibold text-slate-500">
                        Notes
                      </dt>
                      <dd className="text-sm text-slate-700">
                        {followUp.notes}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </>
          )}

          {isCancelling && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-sm font-medium text-rose-800">
                Are you sure you want to cancel this follow-up?
              </p>
            </div>
          )}
        </div>

        {followUp && followUp.status === "PENDING" && (
          <div className="border-t border-slate-100 p-6">
            {isCancelling ? (
              <div className="flex gap-3">
                <button
                  disabled={isUpdating}
                  onClick={() => setIsCancelling(false)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  Keep Follow-up
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusUpdate("CANCELLED")}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                >
                  {isUpdating ? "Cancelling…" : "Confirm Cancel"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setBookAppointmentOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800"
                >
                  <CalendarDays size={16} /> Book Appointment
                </button>
                <div className="flex gap-3">
                  <button
                    disabled={isUpdating}
                    onClick={() => handleStatusUpdate("COMPLETED")}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm font-bold transition hover:bg-green-100 disabled:opacity-60"
                  >
                    <CheckCircle size={16} /> Complete
                  </button>
                  <button
                    onClick={() => setIsCancelling(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-rose-200 text-rose-600 px-4 py-3 text-sm font-bold transition hover:bg-rose-50"
                  >
                    <Ban size={16} /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {bookAppointmentOpen && followUp && followUp.patient && (
        <NewBookingDrawer
          open={bookAppointmentOpen}
          onClose={() => setBookAppointmentOpen(false)}
          preselectedPatient={{
            id: followUp.patient.id,
            name: followUp.patient.name,
            phone: followUp.patient.phone,
          }}
          onSuccess={() => {
            handleStatusUpdate("COMPLETED");
            setBookAppointmentOpen(false);
          }}
        />
      )}
    </>
  );
}
