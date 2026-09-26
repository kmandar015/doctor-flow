"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  FileText,
  Mail,
  Phone,
  Tag,
  User,
  X,
} from "lucide-react";
import type { Appointment, AppointmentStatus } from "@/lib/database/types";
import { AppointmentAvatar } from "@/app/dashboard/components/AppointmentAvatar";
import {
  deriveAge,
  deriveColor,
  deriveInitials,
  formatDate,
  formatTime,
} from "@/lib/appointments/view-models";
import { useToast } from "./ToastContext";

// ─── Status display helpers ───────────────────────────────────────────────────

const statusLabel: Record<AppointmentStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const statusBadge: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  CONFIRMED: "bg-emerald-50 text-emerald-600",
  COMPLETED: "bg-slate-100 text-slate-500",
  REJECTED: "bg-rose-50 text-rose-500",
  CANCELLED: "bg-slate-100 text-slate-500",
};

// ─── Status action buttons ────────────────────────────────────────────────────

// (Actions are generated dynamically inside the component)

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentDetail({
  appointmentId,
  onClose,
}: {
  appointmentId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [fetchState, setFetchState] = useState<{
    resolvedId: string | null;
    appointment: Appointment | null;
    error: string | null;
  }>({ resolvedId: null, appointment: null, error: null });
  const [retryCount, setRetryCount] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const { resolvedId, appointment, error: fetchError } = fetchState;
  const loading =
    appointmentId !== null && resolvedId !== appointmentId && !fetchError;

  const handleClose = () => {
    setIsRescheduling(false);
    setIsCancelling(false);
    onClose();
  };

  useEffect(() => {
    if (!rescheduleDate) {
      setTimeout(() => setAvailableSlots([]), 0);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingSlots(true);
    let cancelled = false;
    fetch(
      `/api/availability/slots?date=${rescheduleDate}&excludeId=${appointmentId}`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAvailableSlots(data.slots || []);
      })
      .catch(() => {
        if (!cancelled) setAvailableSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rescheduleDate, appointmentId]);

  useEffect(() => {
    let cancelled = false;

    if (!appointmentId) {
      return;
    }

    fetch(`/api/appointments/${appointmentId}`)
      .then((res) => {
        if (res.status === 404) throw new Error("not-found");
        if (!res.ok) throw new Error("server-error");
        return res.json() as Promise<{ appointment: Appointment }>;
      })
      .then(({ appointment: data }) => {
        if (cancelled) return;
        setActionError(null);
        setFetchState({
          resolvedId: appointmentId,
          appointment: data,
          error: null,
        });
        setRescheduleDate(data.appointmentDate);
        setRescheduleTime(data.appointmentTime);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setFetchState({
          resolvedId: appointmentId,
          appointment: null,
          error:
            err.message === "not-found"
              ? "Appointment not found."
              : "Unable to load appointment. Please try again.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [appointmentId, retryCount]);

  const handleStatusChange = (nextStatus: AppointmentStatus) =>
    startTransition(async () => {
      if (!appointment) return;
      setActionError(null);
      const res = await fetch(`/api/appointments/${appointment.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const msg =
          data?.error ?? "Could not update appointment. Please try again.";
        setActionError(msg);
        showToast(msg, "error");
        return;
      }
      showToast("Appointment status updated successfully.");
      router.refresh();
      setIsCancelling(false);

      // Update local state without closing drawer
      setFetchState((prev) => ({
        ...prev,
        appointment: { ...prev.appointment!, status: nextStatus },
      }));
    });

  const handleReschedule = () =>
    startTransition(async () => {
      if (!appointment) return;
      setActionError(null);
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentDate: rescheduleDate,
          appointmentTime: rescheduleTime,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const msg =
          data?.error ?? "Could not update appointment. Please try again.";
        setActionError(msg);
        showToast(msg, "error");
        return;
      }
      showToast("Appointment rescheduled successfully.");
      router.refresh();
      setIsRescheduling(false);

      // Update local state
      setFetchState((prev) => ({
        ...prev,
        appointment: {
          ...prev.appointment!,
          appointmentDate: rescheduleDate,
          appointmentTime: rescheduleTime,
        },
      }));
    });

  if (!appointmentId) return null;

  type Action = {
    label: string;
    onClick: () => void;
    variant: "primary" | "danger" | "secondary";
    Icon: React.FC<{ size?: number }>;
  };

  const getActions = (): Action[] => {
    if (!appointment) return [];
    if (appointment.status === "PENDING") {
      return [
        {
          label: "Confirm",
          onClick: () => handleStatusChange("CONFIRMED"),
          variant: "primary",
          Icon: Check,
        },
        {
          label: "Reschedule",
          onClick: () => setIsRescheduling(true),
          variant: "secondary",
          Icon: Calendar,
        },
        {
          label: "Cancel",
          onClick: () => setIsCancelling(true),
          variant: "danger",
          Icon: Ban,
        },
      ];
    }
    if (appointment.status === "CONFIRMED") {
      return [
        {
          label: "Complete",
          onClick: () => handleStatusChange("COMPLETED"),
          variant: "primary",
          Icon: CheckCircle,
        },
        {
          label: "Reschedule",
          onClick: () => setIsRescheduling(true),
          variant: "secondary",
          Icon: Calendar,
        },
        {
          label: "Cancel",
          onClick: () => setIsCancelling(true),
          variant: "danger",
          Icon: Ban,
        },
      ];
    }
    return [];
  };

  const actions = getActions();

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
        aria-label="Appointment details"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-bold text-slate-800">
            {isRescheduling
              ? "Reschedule Appointment"
              : isCancelling
                ? "Cancel Appointment"
                : "Appointment Details"}
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <p className="py-16 text-center text-sm text-slate-400">Loading…</p>
          )}

          {!loading && fetchError && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle size={32} className="text-slate-300" />
              <p className="text-sm text-slate-500">{fetchError}</p>
              <button
                onClick={() => {
                  setFetchState({
                    resolvedId: null,
                    appointment: null,
                    error: null,
                  });
                  setRetryCount((c) => c + 1);
                }}
                className="rounded-lg bg-teal-50 px-4 py-2 text-sm font-semibold text-brand hover:bg-teal-100"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !fetchError && appointment && (
            <>
              {/* Patient identity row */}
              <div className="flex items-center gap-4">
                <AppointmentAvatar
                  initials={deriveInitials(appointment.patient.name)}
                  color={deriveColor(appointment.patient.name)}
                  size="md"
                />
                <div>
                  <p className="font-bold text-slate-800">
                    {appointment.patient.name}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadge[appointment.status]}`}
                  >
                    {statusLabel[appointment.status]}
                  </span>
                </div>
              </div>

              {!isRescheduling && !isCancelling && (
                <>
                  {/* Patient details */}
                  <section className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Patient
                    </p>
                    <dl className="space-y-2.5">
                      <DetailRow
                        icon={<Phone size={14} />}
                        label="Phone"
                        value={appointment.patient.phone}
                      />
                      {appointment.patient.email && (
                        <DetailRow
                          icon={<Mail size={14} />}
                          label="Email"
                          value={appointment.patient.email}
                        />
                      )}
                      {appointment.patient.dateOfBirth ? (
                        <DetailRow
                          icon={<User size={14} />}
                          label="Date of birth"
                          value={`${formatDate(appointment.patient.dateOfBirth)} (${deriveAge(appointment.patient.dateOfBirth)} yrs)`}
                        />
                      ) : (
                        <DetailRow
                          icon={<User size={14} />}
                          label="Age"
                          value="—"
                        />
                      )}
                      {appointment.patient.gender && (
                        <DetailRow
                          icon={<User size={14} />}
                          label="Gender"
                          value={appointment.patient.gender}
                        />
                      )}
                    </dl>
                  </section>

                  {/* Appointment details */}
                  <section className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Appointment
                    </p>
                    <dl className="space-y-2.5">
                      <DetailRow
                        icon={<Calendar size={14} />}
                        label="Date"
                        value={formatDate(appointment.appointmentDate)}
                      />
                      <DetailRow
                        icon={<Clock size={14} />}
                        label="Time"
                        value={formatTime(appointment.appointmentTime)}
                      />
                      {appointment.reason && (
                        <DetailRow
                          icon={<Tag size={14} />}
                          label="Reason"
                          value={appointment.reason}
                        />
                      )}
                      {appointment.notes && (
                        <DetailRow
                          icon={<FileText size={14} />}
                          label="Notes"
                          value={appointment.notes}
                        />
                      )}
                      <DetailRow
                        icon={<Tag size={14} />}
                        label="Source"
                        value={appointment.source}
                      />
                      <DetailRow
                        icon={<Calendar size={14} />}
                        label="Created"
                        value={new Intl.DateTimeFormat("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(appointment.createdAt))}
                      />
                    </dl>
                  </section>
                </>
              )}

              {isRescheduling && (
                <div className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      New Date
                    </label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      New Time
                    </label>
                    <select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
                      disabled={loadingSlots}
                      required
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
                  </div>
                </div>
              )}

              {isCancelling && (
                <div className="mt-6">
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-sm text-rose-800 font-medium">
                      Are you sure you want to cancel this appointment?
                    </p>
                    <p className="text-xs text-rose-600 mt-1">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              )}

              {actionError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600"
                >
                  {actionError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer — status action buttons */}
        {!loading && !fetchError && appointment && (
          <div className="border-t border-slate-100 px-6 py-4">
            {isRescheduling ? (
              <div className="flex gap-3">
                <button
                  disabled={isPending}
                  onClick={() => setIsRescheduling(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  disabled={isPending}
                  onClick={handleReschedule}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
              </div>
            ) : isCancelling ? (
              <div className="flex gap-3">
                <button
                  disabled={isPending}
                  onClick={() => setIsCancelling(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Keep Appointment
                </button>
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange("CANCELLED")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {isPending ? "Cancelling…" : "Confirm Cancel"}
                </button>
              </div>
            ) : actions.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {actions.map(({ label, onClick, variant, Icon }) => (
                  <button
                    key={label}
                    disabled={isPending}
                    onClick={onClick}
                    className={`flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60 ${
                      variant === "primary"
                        ? "bg-brand text-white hover:bg-teal-800"
                        : variant === "secondary"
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          : "border border-rose-200 text-rose-500 hover:bg-rose-50"
                    }`}
                  >
                    <Icon size={15} />
                    {isPending ? "Saving…" : label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </aside>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <dt className="w-24 shrink-0 text-xs font-semibold text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-xs text-slate-700">{value}</dd>
    </div>
  );
}
