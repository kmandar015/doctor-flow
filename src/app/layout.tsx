import type { Metadata } from "next";
import { AppFrame, type FrameDoctor } from "./components/AppFrame";
import { ToastProvider } from "./components/ToastContext";
import { getSessionDoctorId } from "@/lib/database/auth";
import { doctorInitials, getDoctorById } from "@/lib/database/doctors";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doctor Flow",
  description: "A simpler way to manage your practice.",
};

async function getFrameDoctor(): Promise<FrameDoctor | null> {
  const doctorId = await getSessionDoctorId();
  const doctor = doctorId ? getDoctorById(doctorId) : null;
  return doctor
    ? {
        name: doctor.name,
        specialization: doctor.specialization,
        initials: doctorInitials(doctor.name),
      }
    : null;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AppFrame doctor={await getFrameDoctor()}>{children}</AppFrame>
        </ToastProvider>
      </body>
    </html>
  );
}
