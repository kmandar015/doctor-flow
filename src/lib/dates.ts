/**
 * Calendar-date helpers that work in the clinic's time zone.
 *
 * `new Date().toISOString().slice(0, 10)` returns the UTC date, which is the
 * previous day in India between 00:00 and 05:30. Every "today" / "now"
 * comparison in the app goes through these helpers instead.
 *
 * Safe to import from both server and client code.
 */

export const CLINIC_TIME_ZONE =
  process.env.NEXT_PUBLIC_CLINIC_TIME_ZONE || "Asia/Kolkata";

const pad = (value: number) => String(value).padStart(2, "0");

const clinicFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLINIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function clinicParts(now: Date) {
  const parts: Record<string, string> = {};
  for (const part of clinicFormatter.formatToParts(now)) {
    parts[part.type] = part.value;
  }
  return parts;
}

/** Today's date in the clinic time zone, as `YYYY-MM-DD`. */
export function todayISO(now: Date = new Date()): string {
  const p = clinicParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

/** The current time in the clinic time zone, as `HH:MM` (24-hour). */
export function currentTimeHHMM(now: Date = new Date()): string {
  const p = clinicParts(now);
  return `${p.hour}:${p.minute}`;
}

/**
 * Formats a Date built from local year/month/day parts (for example
 * `new Date(2026, 10, 30)`) as `YYYY-MM-DD`, without converting to UTC.
 */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Adds (or subtracts) whole days to a `YYYY-MM-DD` string. */
export function addDaysISO(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

/** Last day of the month that `isoDate` falls in, as `YYYY-MM-DD`. */
export function endOfMonthISO(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${isoDate.slice(0, 7)}-${pad(lastDay)}`;
}

/** True when the given date + time is earlier than now in the clinic. */
export function isPastSlot(
  date: string,
  time: string,
  now: Date = new Date(),
): boolean {
  return `${date} ${time}` < `${todayISO(now)} ${currentTimeHHMM(now)}`;
}
