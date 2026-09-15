"use client";

import { Check, Clock3, MoreHorizontal, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Appointment } from "../types";
import { AppointmentAvatar } from "./AppointmentAvatar";
import { useToast } from "@/app/components/ToastContext";

export function PendingRequests({
  initialRequests,
}: {
  initialRequests: Appointment[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();

  const handle = (id: string, status: "CONFIRMED" | "REJECTED") =>
    startTransition(async () => {
      setError("");
      const response = await fetch(`/api/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const msg = data?.error ?? "Could not update the appointment.";
        setError(msg);
        showToast(msg, "error");
        return;
      }

      showToast(
        status === "CONFIRMED"
          ? "Appointment confirmed."
          : "Appointment rejected.",
      );
      setRequests((items) => items.filter((item) => item.id !== id));
      router.refresh();
    });
  return (
    <section className="rounded-2xl border border-teal-100 bg-white shadow-card">
      <div className="flex items-start justify-between border-b border-teal-50 px-5 py-5 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-brand">
              <Clock3 size={17} />
            </span>
            <h2 className="font-bold text-slate-800">
              Pending appointment requests
            </h2>
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">
              {requests.length}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            New requests received from patients
          </p>
        </div>
        <Link
          href="/bookings?status=Pending"
          className="text-sm font-semibold text-brand hover:text-teal-900"
        >
          View all
        </Link>
      </div>
      {error && (
        <p role="alert" className="px-6 pt-4 text-sm text-rose-600">
          {error}
        </p>
      )}
      {requests.length ? (
        <div className="divide-y divide-slate-100">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <AppointmentAvatar
                  initials={request.initials}
                  color={request.color}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-700">
                    {request.patient}{" "}
                    <span className="font-normal text-slate-400">
                      · {request.age} yrs
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {request.reason}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <p className="whitespace-nowrap text-sm font-semibold text-slate-600">
                  {request.date} <span className="text-slate-300">·</span>{" "}
                  {request.time}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={isPending}
                    onClick={() => handle(request.id, "CONFIRMED")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    <Check size={15} />
                    Accept
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => handle(request.id, "REJECTED")}
                    aria-label={`Reject ${request.patient}`}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500 disabled:opacity-60"
                  >
                    <X size={16} />
                  </button>
                  <button
                    aria-label={`More options for ${request.patient}`}
                    className="hidden text-slate-400 sm:block"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-10 text-center text-sm text-slate-400">
          You&apos;re all caught up — no pending requests.
        </div>
      )}
    </section>
  );
}
