import "server-only";

import { formatTime } from "@/lib/appointments/view-models";

/** "2026-11-17" -> "Tue, 17 Nov" */
export function friendlyDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** "14:30" -> "2:30 pm" */
export const friendlyTime = (time: string) => formatTime(time);

export const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
