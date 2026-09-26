"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Tag } from "lucide-react";
import { FollowUpDrawer } from "@/app/components/FollowUpDrawer";
import type { Patient, Appointment, FollowUp } from "@/lib/database/types";
import { AppointmentDetail } from "@/app/components/AppointmentDetail";
import { formatDate, formatTime } from "@/lib/appointments/view-models";
import { useToast } from "@/app/components/ToastContext";

// ─── Status helpers ────────────────────────────────────────────────────────────

const statusBadge: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  CONFIRMED: "bg-emerald-50 text-emerald-600",
  COMPLETED: "bg-slate-100 text-slate-500",
  REJECTED: "bg-rose-50 text-rose-500",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const statusLabel: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientDetailClient({
  patient,
  initialAppointments,
  initialFollowUps = [],
}: {
  patient: Patient;
  initialAppointments: Appointment[];
  initialFollowUps?: FollowUp[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [notes, setNotes] = useState(patient.notes ?? "");
  const [isSavingNotes, startNotesTransition] = useTransition();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [addFollowUpOpen, setAddFollowUpOpen] = useState(false);

  // Stats
  const total = initialAppointments.length;
  const completed = initialAppointments.filter(
    (a) => a.status === "COMPLETED",
  ).length;
  const cancelled = initialAppointments.filter(
    (a) => a.status === "CANCELLED",
  ).length;
  const upcoming = initialAppointments.filter(
    (a) =>
      (a.status === "PENDING" || a.status === "CONFIRMED") &&
      a.appointmentDate >= new Date().toISOString().slice(0, 10),
  ).length;

  const handleSaveNotes = () => {
    startNotesTransition(async () => {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        showToast("Could not save notes.", "error");
        return;
      }
      showToast("Notes saved successfully.");
      router.refresh();
    });
  };

  return (
    <>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: info + notes + appointment history */}
        <div className="space-y-6">
          {/* Contact info */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-400">
              Contact &amp; Info
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Phone" value={patient.phone} />
              {patient.email && <InfoRow label="Email" value={patient.email} />}
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
            </dl>
          </section>

          {/* Notes */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              Clinical Notes
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes about this patient…"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
            />
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="mt-3 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {isSavingNotes ? "Saving…" : "Save Notes"}
            </button>
          </section>

          {/* Appointment history */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-400">
              Appointment History
            </p>
            {initialAppointments.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No appointments yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {initialAppointments.map((appt) => (
                  <button
                    key={appt.id}
                    onClick={() => setSelectedAppointmentId(appt.id)}
                    className="w-full py-3 text-left transition hover:bg-slate-50 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar size={12} />
                            {formatDate(appt.appointmentDate)}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock size={12} />
                            {formatTime(appt.appointmentTime)}
                          </span>
                        </div>
                        {appt.reason && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Tag size={12} />
                            {appt.reason}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadge[appt.status] ?? ""}`}
                      >
                        {statusLabel[appt.status] ?? appt.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Follow-ups */}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Follow-ups
              </p>
              <button
                onClick={() => setAddFollowUpOpen(true)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                + Add Follow-up
              </button>
            </div>

            {initialFollowUps.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No follow-ups scheduled.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {initialFollowUps.map((followUp) => (
                  <div
                    key={followUp.id}
                    className="w-full py-3 text-left transition hover:bg-slate-50 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar size={12} />
                            {formatDate(followUp.followUpDate)}
                          </span>
                        </div>
                        {followUp.reason && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Tag size={12} />
                            {followUp.reason}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: summary stats */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-400">
              Summary
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total" value={total} color="text-slate-700" />
              <StatCard
                label="Completed"
                value={completed}
                color="text-emerald-600"
              />
              <StatCard
                label="Upcoming"
                value={upcoming}
                color="text-teal-600"
              />
              <StatCard
                label="Cancelled"
                value={cancelled}
                color="text-slate-400"
              />
            </div>
          </section>
        </div>
      </div>

      {/* Appointment detail drawer */}
      {selectedAppointmentId && (
        <AppointmentDetail
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      )}

      {/* Follow Up drawer */}
      <FollowUpDrawer
        open={addFollowUpOpen}
        onClose={() => setAddFollowUpOpen(false)}
        patient={patient}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

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

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </div>
  );
}
