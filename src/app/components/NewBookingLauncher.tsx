"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { NewBookingDrawer } from "./NewBookingDrawer";

/**
 * One booking drawer for the whole dashboard. Any page opens it with
 * <NewBookingButton />, and the "N" key opens it from anywhere.
 */
const NewBookingContext = createContext<(() => void) | null>(null);

export function NewBookingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "n" && event.key !== "N") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true']") ||
        document.querySelector('[role="dialog"]')
      )
        return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <NewBookingContext.Provider value={() => setOpen(true)}>
      {children}
      <NewBookingDrawer open={open} onClose={() => setOpen(false)} />
    </NewBookingContext.Provider>
  );
}

export function useNewBooking() {
  const openBooking = useContext(NewBookingContext);
  if (!openBooking)
    throw new Error("useNewBooking must be used within NewBookingProvider");
  return openBooking;
}

/** The primary "New booking" action, as on the Bookings page. */
export function NewBookingButton({ className = "" }: { className?: string }) {
  const openBooking = useNewBooking();
  return (
    <button
      type="button"
      onClick={openBooking}
      aria-label="New booking"
      title="New booking (N)"
      className={`inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 ${className}`}
    >
      <CalendarPlus size={18} />
      <span className="hidden sm:inline">New booking</span>
    </button>
  );
}
