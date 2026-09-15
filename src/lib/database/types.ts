export const appointmentStatuses = ["PENDING", "CONFIRMED", "REJECTED", "COMPLETED", "CANCELLED"] as const;
export type AppointmentStatus = (typeof appointmentStatuses)[number];

export const appointmentSources = ["WHATSAPP", "DASHBOARD", "MANUAL"] as const;
export type AppointmentSource = (typeof appointmentSources)[number];

export type Patient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Doctor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  clinicName: string;
};

export type Appointment = {
  id: string;
  doctorId: string;
  patientId: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string | null;
  notes: string | null;
  status: AppointmentStatus;
  source: AppointmentSource;
  createdAt: string;
  updatedAt: string;
  patient: Patient;
};
