export type AppointmentStatus = "Pending" | "Confirmed" | "Rejected" | "Completed" | "Cancelled";

export type Appointment = {
  id: string;
  patient: string;
  initials: string;
  age: number;
  reason: string;
  time: string;
  date?: string;
  status: AppointmentStatus;
  color: "peach" | "violet" | "blue" | "green";
};

export type Stat = {
  label: string;
  value: string;
  detail: string;
  trend: string;
  icon: "calendar" | "clock" | "check" | "users";
  tone: "teal" | "amber" | "violet" | "blue";
};

export type Patient = {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: "Female" | "Male";
  phone: string;
  lastVisit: string;
  visits: number;
  color: "peach" | "violet" | "blue" | "green";
};
