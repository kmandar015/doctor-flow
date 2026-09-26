"use client";

import { useState } from "react";
import type { FollowUp } from "@/lib/database/types";
import { formatDate } from "@/lib/appointments/view-models";
import { MoreHorizontal } from "lucide-react";
import { PatientDetailDrawer } from "@/app/patients/components/PatientDetailDrawer";

export function FollowUpsClient({
  initialFollowUps,
}: {
  initialFollowUps: FollowUp[];
}) {
  const [followUps, setFollowUps] = useState<FollowUp[]>(initialFollowUps);
  const [filter, setFilter] = useState<
    "today" | "upcoming" | "overdue" | "completed" | "all"
  >("today");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );

  const fetchFollowUps = async (f: typeof filter) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/follow-ups?filter=${f}`);
      if (!res.ok) throw new Error("Failed to load follow-ups.");
      const data = (await res.json()) as { followUps: FollowUp[] };
      setFollowUps(data.followUps);
    } catch {
      setError("Unable to load follow-ups. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    void fetchFollowUps(newFilter);
  };

  return (
    <>
      {/* Tabs */}
      <div className="mt-7 flex gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {["today", "upcoming", "overdue", "completed", "all"].map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f as typeof filter)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "border-b-2 border-brand text-brand"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="hidden grid-cols-[1.5fr_1fr_1.5fr_1fr_36px] gap-4 border-b border-slate-100 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 lg:grid">
          <span>Patient</span>
          <span>Date</span>
          <span>Reason</span>
          <span>Status</span>
          <span />
        </div>

        {isLoading && (
          <p className="py-16 text-center text-sm text-slate-400">
            Loading follow-ups...
          </p>
        )}
        {!isLoading && error && (
          <p className="py-16 text-center text-sm text-rose-500">{error}</p>
        )}
        {!isLoading && !error && followUps.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm font-semibold text-slate-600">
              {filter === "today"
                ? "No follow-ups for today."
                : filter === "upcoming"
                  ? "No upcoming follow-ups scheduled."
                  : filter === "overdue"
                    ? "No overdue follow-ups."
                    : filter === "completed"
                      ? "No completed follow-ups."
                      : "No follow-ups found."}
            </p>
          </div>
        )}

        {!isLoading && !error && followUps.length > 0 && (
          <div className="divide-y divide-slate-100">
            {followUps.map((followUp) => (
              <article
                key={followUp.id}
                className="grid cursor-pointer gap-3 px-5 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.5fr_1fr_1.5fr_1fr_36px] lg:items-center lg:gap-4 lg:px-6"
                onClick={() => setSelectedPatientId(followUp.patientId)}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {followUp.patient?.name}
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  {formatDate(followUp.followUpDate)}
                </p>
                <p className="text-sm text-slate-500 truncate">
                  {followUp.reason || "—"}
                </p>
                <div>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                      followUp.status === "COMPLETED"
                        ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                        : followUp.status === "CANCELLED"
                          ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
                          : followUp.followUpDate <
                              new Date().toISOString().slice(0, 10)
                            ? "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20" // Overdue
                            : "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10"
                    }`}
                  >
                    {followUp.status === "PENDING" &&
                    followUp.followUpDate <
                      new Date().toISOString().slice(0, 10)
                      ? "OVERDUE"
                      : followUp.status}
                  </span>
                </div>
                <span className="text-slate-300">
                  <MoreHorizontal size={20} />
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedPatientId && (
        <PatientDetailDrawer
          patientId={selectedPatientId}
          onClose={() => {
            setSelectedPatientId(null);
            void fetchFollowUps(filter);
          }}
        />
      )}
    </>
  );
}
