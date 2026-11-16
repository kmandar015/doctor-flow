import { ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { doctorInitials, getDoctorById } from "@/lib/database/doctors";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { AccountForm } from "./AccountForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const doctor = getDoctorById(await getCurrentDoctorId());
  if (!doctor) return null;
  const whatsapp = getWhatsAppConfig();

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="pt-8 md:pt-0">
        <p className="text-sm font-medium text-brand">Settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
          My account
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage your professional profile and preferences.
        </p>
      </div>
      <div className="mt-7 grid gap-6 lg:grid-cols-[0.85fr_1.45fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-card">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#dbeeea] text-2xl font-bold text-brand">
            {doctorInitials(doctor.name)}
          </div>
          <h2 className="mt-4 font-bold text-slate-800">{doctor.name}</h2>
          <p className="mt-1 text-sm text-slate-400">{doctor.specialization}</p>
          <div className="mt-6 rounded-xl bg-teal-50 p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-brand">
              Practice profile
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {doctor.clinicName}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {doctor.email}
            </p>
          </div>
        </section>
        <div className="space-y-6">
          <AccountForm doctor={doctor} />
          <section className="rounded-2xl border border-slate-100 bg-white shadow-card">
            <Link
              href="/whatsapp"
              className="flex w-full items-center gap-3 p-5 text-left sm:p-6"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-green-50 text-green-700">
                <MessageCircle size={20} />
              </span>
              <span className="flex-1">
                <span className="block font-bold text-slate-800">
                  WhatsApp assistant
                </span>
                <span className="mt-0.5 block text-sm text-slate-400">
                  {whatsapp.mode === "meta"
                    ? `Connected to WhatsApp${whatsapp.displayNumber ? ` · ${whatsapp.displayNumber}` : ""}`
                    : "Demo mode: messages are simulated, nothing is sent"}
                </span>
              </span>
              <ChevronRight className="text-slate-400" size={20} />
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
