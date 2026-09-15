import type { Appointment } from "@/lib/database/types";
import type { Patient } from "@/app/dashboard/types";

const colors = ["blue", "violet", "green", "peach"] as const;

/** Derives the 1–2-letter initials from a full name. */
export function deriveInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Calculates age in whole years from an ISO date-of-birth string. */
export function deriveAge(dateOfBirth: string | null) {
  return dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(dateOfBirth).getTime()) / 31_557_600_000,
      )
    : 0;
}

/** Picks a deterministic avatar colour from the shared palette. */
export function deriveColor(name: string): (typeof colors)[number] {
  return colors[name.length % colors.length];
}

export type UiAppointment = {
  id: string;
  patient: string;
  initials: string;
  age: number;
  reason: string;
  time: string;
  date?: string;
  status: "Pending" | "Confirmed" | "Rejected" | "Completed" | "Cancelled";
  color: (typeof colors)[number];
};

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

export const formatTime = (time: string) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`2000-01-01T${time}:00`));

export function toUiAppointment(appointment: Appointment): UiAppointment {
  return {
    id: appointment.id,
    patient: appointment.patient.name,
    initials: deriveInitials(appointment.patient.name),
    age: deriveAge(appointment.patient.dateOfBirth),
    reason: appointment.reason ?? "General consultation",
    time: formatTime(appointment.appointmentTime),
    date: formatDate(appointment.appointmentDate),
    status:
      `${appointment.status[0]}${appointment.status.slice(1).toLowerCase()}` as UiAppointment["status"],
    color: deriveColor(appointment.patient.name),
  };
}

type PatientRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  lastVisit: string;
  visits: number;
};

export function toUiPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    name: row.name,
    initials: deriveInitials(row.name),
    age: deriveAge(row.dateOfBirth),
    gender: (row.gender ?? "Male") as "Male" | "Female",
    phone: row.phone,
    lastVisit: formatDate(row.lastVisit),
    visits: row.visits,
    color: deriveColor(row.name),
  };
}
