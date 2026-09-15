"use client";

import { useState } from "react";
import type { Appointment } from "../types";
import { AppointmentList } from "./AppointmentList";
import { AppointmentDetail } from "../../components/AppointmentDetail";

/**
 * Client wrapper for the two appointment lists on the dashboard.
 * Manages the shared "selected appointment" state so clicking any row
 * opens the AppointmentDetail drawer.
 */
export function DashboardAppointmentsSection({
  todaysAppointments,
  upcomingAppointments,
}: {
  todaysAppointments: Appointment[];
  upcomingAppointments: Appointment[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <AppointmentList
        title="Today's appointments"
        appointments={todaysAppointments}
        onSelect={setSelectedId}
        viewAllHref="/bookings?status=Confirmed"
      />
      <AppointmentList
        title="Upcoming · confirmed"
        appointments={upcomingAppointments}
        upcoming
        onSelect={setSelectedId}
        viewAllHref="/bookings?status=Confirmed"
      />
      <AppointmentDetail
        appointmentId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
