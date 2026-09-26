"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/ToastContext";

type AvailabilityForm = {
  workingDays: number[];
  workStart: string;
  workEnd: string;
  breakStart: string | null;
  breakEnd: string | null;
  slotDuration: number;
};

const daysOfWeek = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 0, name: "Sunday" },
];

export function AvailabilityClient() {
  const [form, setForm] = useState<AvailabilityForm>({
    workingDays: [1, 2, 3, 4, 5],
    workStart: "09:00",
    workEnd: "17:00",
    breakStart: "13:00",
    breakEnd: "14:00",
    slotDuration: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/availability")
      .then((res) => res.json())
      .then((data) => {
        if (data.availability) {
          setForm({
            workingDays: data.availability.workingDays,
            workStart: data.availability.workStart,
            workEnd: data.availability.workEnd,
            breakStart: data.availability.breakStart || "",
            breakEnd: data.availability.breakEnd || "",
            slotDuration: data.availability.slotDuration,
          });
        }
      })
      .catch(() =>
        showToast("Unable to load availability. Please try again.", "error"),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.workStart >= form.workEnd) {
      showToast("Work start time must be before end time.", "error");
      return;
    }
    if (form.breakStart && form.breakEnd && form.breakStart >= form.breakEnd) {
      showToast("Break start time must be before end time.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          breakStart: form.breakStart || null,
          breakEnd: form.breakEnd || null,
        }),
      });
      if (res.ok) {
        showToast("Availability updated successfully.");
      } else {
        const data = await res.json();
        showToast(
          data.error || "Please enter a valid working-hour range.",
          "error",
        );
      }
    } catch {
      showToast("An error occurred.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading availability...
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="space-y-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:p-6"
    >
      <div>
        <h2 className="font-bold text-slate-800">Working Days</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Select the days you are available for appointments.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {daysOfWeek.map((day) => {
            const selected = form.workingDays.includes(day.id);
            return (
              <button
                type="button"
                key={day.id}
                onClick={() => toggleDay(day.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? "bg-brand text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {day.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-bold text-slate-800">Working Hours</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Start Time
              <input
                type="time"
                value={form.workStart}
                onChange={(e) =>
                  setForm({ ...form, workStart: e.target.value })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-brand"
                required
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
              End Time
              <input
                type="time"
                value={form.workEnd}
                onChange={(e) => setForm({ ...form, workEnd: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-brand"
                required
              />
            </label>
          </div>
        </div>

        <div>
          <h2 className="font-bold text-slate-800">Break Period (Optional)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Break Start
              <input
                type="time"
                value={form.breakStart || ""}
                onChange={(e) =>
                  setForm({ ...form, breakStart: e.target.value })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-brand"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Break End
              <input
                type="time"
                value={form.breakEnd || ""}
                onChange={(e) => setForm({ ...form, breakEnd: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-brand"
              />
            </label>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-bold text-slate-800">Appointment Duration</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Duration in minutes for each appointment slot.
        </p>
        <div className="mt-4 max-w-[200px]">
          <input
            type="number"
            min="10"
            max="120"
            step="5"
            value={form.slotDuration}
            onChange={(e) =>
              setForm({ ...form, slotDuration: parseInt(e.target.value) || 30 })
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium tracking-normal text-slate-700 outline-none focus:border-brand"
            required
          />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Availability"}
        </button>
      </div>
    </form>
  );
}
