"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  X,
} from "lucide-react";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { addDaysISO, todayISO } from "@/lib/dates";
import {
  deriveAge,
  formatDate,
  formatTime,
} from "@/lib/appointments/view-models";
import type { PatientWithStats } from "@/lib/database/patients";
import { useToast } from "./ToastContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type PreselectedPatient = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
};

type ChosenPatient = Pick<
  PatientWithStats,
  "id" | "name" | "phone" | "dateOfBirth" | "gender"
>;

type When = "now" | "later";

type FieldErrors = Partial<
  Record<"name" | "phone" | "age" | "gender" | "date" | "time", string>
>;

type Booked = {
  name: string;
  date: string;
  time: string;
  overlaps: Array<{ name: string; time: string }>;
};

const GENDERS = ["Male", "Female", "Other"] as const;
const REASONS = ["Fever", "Consultation", "Follow-up", "Review"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Books an appointment from the dashboard. Built for a patient standing at
 * the desk: type a phone number or name, pick "Now", book.
 */
export function NewBookingDrawer({
  open,
  onClose,
  preselectedPatient,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  preselectedPatient?: PreselectedPatient;
  /** When given, it runs after booking instead of the "Book another" screen. */
  onSuccess?: () => void;
}) {
  // A new key gives a fresh, empty form for "Book another".
  const [formKey, setFormKey] = useState(0);
  if (!open) return null;
  return (
    <BookingForm
      key={formKey}
      onClose={onClose}
      preselectedPatient={preselectedPatient}
      onSuccess={onSuccess}
      onBookAnother={() => setFormKey((key) => key + 1)}
    />
  );
}

function BookingForm({
  onClose,
  preselectedPatient,
  onSuccess,
  onBookAnother,
}: {
  onClose: () => void;
  preselectedPatient?: PreselectedPatient;
  onSuccess?: () => void;
  onBookAnother: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);

  // Patient
  const [chosen, setChosen] = useState<ChosenPatient | null>(
    preselectedPatient
      ? {
          id: preselectedPatient.id,
          name: preselectedPatient.name,
          phone: preselectedPatient.phone,
          dateOfBirth: preselectedPatient.dateOfBirth ?? null,
          gender: preselectedPatient.gender ?? null,
        }
      : null,
  );
  // The same details the WhatsApp assistant asks a new patient for.
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<PatientWithStats[]>([]);
  const [searching, setSearching] = useState(false);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequest = useRef(0);

  // When
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const [when, setWhen] = useState<When>(preselectedPatient ? "later" : "now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Details
  const [reason, setReason] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  // A chosen patient may be missing what WhatsApp bookings never asked.
  const needsAge = !chosen || !chosen.dateOfBirth;
  const needsGender = !chosen || !chosen.gender;

  // ── Patient lookup ────────────────────────────────────────────────────────

  /** Looks up existing patients as the phone or name is typed. */
  const lookUp = (value: string, minLength: number) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const request = ++searchRequest.current;
    if (value.trim().replace(/[\s()+-]/g, "").length < minLength) {
      setMatches([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      fetch(`/api/patients?search=${encodeURIComponent(value.trim())}`)
        .then((res) => res.json() as Promise<{ patients?: PatientWithStats[] }>)
        .then(({ patients = [] }) => {
          if (request !== searchRequest.current) return; // a newer search is running
          // A full phone number that belongs to one patient picks them.
          const full = normalizePhone(value);
          const exact = full && patients.find((p) => p.phone === full);
          if (exact) choosePatient(exact);
          else setMatches(patients.slice(0, 5));
        })
        .catch(() => setMatches([]))
        .finally(() => {
          if (request === searchRequest.current) setSearching(false);
        });
    }, 250);
  };

  const choosePatient = (patient: ChosenPatient) => {
    setChosen(patient);
    setMatches([]);
    setErrors({});
  };

  const changePatient = () => {
    setChosen(null);
    setPhone("");
    setName("");
    setMatches([]);
  };

  // ── When ──────────────────────────────────────────────────────────────────

  const pickDate = (value: string) => {
    setDate(value);
    setTime("");
    setErrors((prev) => ({ ...prev, date: undefined, time: undefined }));
    if (!value) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    fetch(`/api/availability/slots?date=${value}`)
      .then((res) => res.json() as Promise<{ slots?: string[] }>)
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  };

  const pickWhen = (value: When) => {
    setWhen(value);
    if (value === "later" && !date) pickDate(today);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  function validate() {
    const errs: FieldErrors = {};
    if (!chosen) {
      if (!normalizePhone(phone)) errs.phone = "Enter a valid phone number.";
      if (!name.trim()) errs.name = "Name is required.";
      if (!age) errs.age = "Age is required.";
      if (!gender) errs.gender = "Select a gender.";
    }
    const years = Number(age);
    if (age && (!Number.isInteger(years) || years < 0 || years > 120)) {
      errs.age = "Enter an age between 0 and 120.";
    }
    if (when === "later") {
      if (!date) errs.date = "Pick a date.";
      else if (!time) errs.time = "Pick a time.";
    }
    return errs;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setServerError(null);

    const patient = {
      name: chosen ? chosen.name : name.trim(),
      phone: chosen ? chosen.phone : phone.trim(),
      // Only what was filled in; an existing patient's details are kept.
      dateOfBirth: age ? approximateBirthDate(today, Number(age)) : undefined,
      gender: gender || undefined,
    };

    startTransition(async () => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: { ...patient, email: email.trim() || undefined },
          walkIn: when === "now",
          appointmentDate: when === "later" ? date : undefined,
          appointmentTime: when === "later" ? time : undefined,
          reason: reason.trim() || undefined,
          notes: notes.trim() || undefined,
          source: "DASHBOARD",
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        appointment?: { appointmentDate: string; appointmentTime: string };
        overlaps?: Booked["overlaps"];
      } | null;

      if (!res.ok || !data?.appointment) {
        const message =
          data?.error ?? "Could not create appointment. Please try again.";
        setServerError(message);
        showToast(message, "error");
        if (res.status === 409 && date) pickDate(date); // that slot just went
        return;
      }

      showToast("Appointment booked.");
      router.refresh();
      if (onSuccess) {
        onSuccess();
        onClose();
        return;
      }
      setBooked({
        name: patient.name,
        date: data.appointment.appointmentDate,
        time: data.appointment.appointmentTime,
        overlaps: data.overlaps ?? [],
      });
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

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

        {booked ? (
          <BookedView
            booked={booked}
            today={today}
            onDone={onClose}
            onBookAnother={onBookAnother}
          />
        ) : (
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

                {chosen ? (
                  <div className="flex items-start justify-between rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {chosen.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {patientDetails(chosen)}
                      </p>
                    </div>
                    {!preselectedPatient && (
                      <button
                        type="button"
                        onClick={changePatient}
                        className="ml-3 text-xs font-semibold text-rose-500 hover:underline"
                      >
                        Change
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <FormField label="Phone *" htmlFor="booking-phone" error={errors.phone}>
                      <input
                        id="booking-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setErrors((prev) => ({ ...prev, phone: undefined }));
                          lookUp(e.target.value, 4);
                        }}
                        placeholder="e.g. 98765 43210"
                        className={inputCls(!!errors.phone)}
                        autoComplete="off"
                        autoFocus
                      />
                    </FormField>

                    <FormField label="Full name *" htmlFor="booking-name" error={errors.name}>
                      <input
                        id="booking-name"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setErrors((prev) => ({ ...prev, name: undefined }));
                          lookUp(e.target.value, 2);
                        }}
                        placeholder="e.g. Aarav Mehta"
                        className={inputCls(!!errors.name)}
                        autoComplete="off"
                      />
                    </FormField>

                    {searching && (
                      <p className="text-xs text-slate-400">Searching…</p>
                    )}

                    {!searching && matches.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-slate-500">
                          Already a patient? Tap to use their details
                        </p>
                        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                          {matches.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => choosePatient(p)}
                              className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl"
                            >
                              <span className="font-semibold text-slate-700">
                                {p.name}
                              </span>
                              <span className="text-xs text-slate-400">
                                {patientDetails(p)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(needsAge || needsGender) && (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {needsAge && (
                      <FormField
                        label={chosen ? "Age" : "Age *"}
                        htmlFor="booking-age"
                        error={errors.age}
                      >
                        <input
                          id="booking-age"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={120}
                          value={age}
                          onChange={(e) => {
                            setAge(e.target.value);
                            setErrors((prev) => ({ ...prev, age: undefined }));
                          }}
                          placeholder="yrs"
                          className={inputCls(!!errors.age)}
                        />
                      </FormField>
                    )}
                    {needsGender && (
                      <div className="col-span-2">
                        <FormField
                          label={chosen ? "Gender" : "Gender *"}
                          error={errors.gender}
                        >
                          <div className="flex gap-2 pt-1">
                            {GENDERS.map((g) => (
                              <Chip
                                key={g}
                                selected={gender === g}
                                onClick={() => {
                                  setGender(gender === g ? "" : g);
                                  setErrors((prev) => ({ ...prev, gender: undefined }));
                                }}
                              >
                                {g}
                              </Chip>
                            ))}
                          </div>
                        </FormField>
                      </div>
                    )}
                  </div>
                )}
              </fieldset>

              {/* ── When ── */}
              <fieldset>
                <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  When
                </legend>
                <div className="flex gap-2">
                  <Chip selected={when === "now"} onClick={() => pickWhen("now")}>
                    Now (walk-in)
                  </Chip>
                  <Chip selected={when === "later"} onClick={() => pickWhen("later")}>
                    Later
                  </Chip>
                </div>

                {when === "now" ? (
                  <p className="mt-2 text-xs text-slate-400">
                    Booked for today at the current time, even outside your slots.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    <FormField label="Date *" htmlFor="booking-date" error={errors.date}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip selected={date === today} onClick={() => pickDate(today)}>
                          Today
                        </Chip>
                        <Chip selected={date === tomorrow} onClick={() => pickDate(tomorrow)}>
                          Tomorrow
                        </Chip>
                        <div className="min-w-0 flex-1">
                          <input
                            id="booking-date"
                            type="date"
                            min={today}
                            value={date}
                            onChange={(e) => pickDate(e.target.value)}
                            className={inputCls(!!errors.date)}
                          />
                        </div>
                      </div>
                    </FormField>

                    {date && (
                      <FormField label="Time *" error={errors.time}>
                        {loadingSlots ? (
                          <p className="text-xs text-slate-400">Loading times…</p>
                        ) : slots.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            No free times on this day.
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {slots.map((slot) => (
                              <Chip
                                key={slot}
                                selected={time === slot}
                                onClick={() => {
                                  setTime(slot);
                                  setErrors((prev) => ({ ...prev, time: undefined }));
                                }}
                              >
                                {formatTime(slot)}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </FormField>
                    )}
                  </div>
                )}
              </fieldset>

              {/* ── Visit ── */}
              <fieldset>
                <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Visit
                </legend>
                <div className="space-y-3">
                  <FormField label="Reason" htmlFor="booking-reason">
                    <div className="mb-2 flex flex-wrap gap-2">
                      {REASONS.map((r) => (
                        <Chip
                          key={r}
                          selected={reason === r}
                          onClick={() => setReason(reason === r ? "" : r)}
                        >
                          {r}
                        </Chip>
                      ))}
                    </div>
                    <input
                      id="booking-reason"
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="or type a reason"
                      className={inputCls(false)}
                    />
                  </FormField>

                  <button
                    type="button"
                    onClick={() => setShowMore((value) => !value)}
                    aria-expanded={showMore}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand"
                  >
                    More details
                    <ChevronDown
                      size={14}
                      className={`transition ${showMore ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showMore && (
                    <>
                      <FormField label="Email" htmlFor="booking-email">
                        <input
                          id="booking-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="optional"
                          className={inputCls(false)}
                          autoComplete="off"
                        />
                      </FormField>
                      <FormField label="Notes" htmlFor="booking-notes">
                        <textarea
                          id="booking-notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Additional notes…"
                          rows={3}
                          className={`${inputCls(false)} resize-none`}
                        />
                      </FormField>
                    </>
                  )}
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
                  {isPending
                    ? "Booking…"
                    : when === "now"
                      ? "Book now"
                      : "Book appointment"}
                </button>
              </div>
            </div>
          </form>
        )}
      </aside>
    </>
  );
}

// ─── Booked ───────────────────────────────────────────────────────────────────

function BookedView({
  booked,
  today,
  onDone,
  onBookAnother,
}: {
  booked: Booked;
  today: string;
  onDone: () => void;
  onBookAnother: () => void;
}) {
  const day = booked.date === today ? "Today" : formatDate(booked.date);
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Booked: {booked.name}
            </p>
            <p className="text-xs text-slate-500">
              {day} at {formatTime(booked.time)} · Confirmed
            </p>
          </div>
        </div>

        {booked.overlaps.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>
              Also booked around this time:{" "}
              {booked.overlaps
                .map((o) => `${o.name} at ${formatTime(o.time)}`)
                .join(", ")}
              .
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-6 py-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDone}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Done
          </button>
          <button
            type="button"
            onClick={onBookAnother}
            autoFocus
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-teal-800"
          >
            Book another
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "+91 98765 43210 · 34 yrs · Male", leaving out what is unknown. */
function patientDetails(p: Pick<ChosenPatient, "phone" | "dateOfBirth" | "gender">) {
  const years = deriveAge(p.dateOfBirth);
  return [formatPhone(p.phone), years > 0 ? `${years} yrs` : null, p.gender]
    .filter(Boolean)
    .join(" · ");
}

/** Today's date `years` ago: an approximate birth date from a stated age. */
function approximateBirthDate(today: string, years: number) {
  const [y, m, d] = today.split("-");
  const day = m === "02" && d === "29" ? "28" : d;
  return `${String(Number(y) - years).padStart(4, "0")}-${m}-${day}`;
}

const inputCls = (hasError: boolean) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-brand/30 ${
    hasError ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
  }`;

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        selected
          ? "bg-brand text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A labelled field. With `htmlFor` the label names one input; without it,
 * the label names the group of buttons inside (gender, time slots).
 */
function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const groupLabelId = useId();
  const labelCls = "mb-1.5 block text-xs font-semibold text-slate-500";
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelCls}>
          {label}
        </label>
      ) : (
        <span id={groupLabelId} className={labelCls}>
          {label}
        </span>
      )}
      {htmlFor ? (
        children
      ) : (
        <div role="group" aria-labelledby={groupLabelId}>
          {children}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
