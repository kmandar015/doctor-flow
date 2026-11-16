import { getCurrentDoctorId } from "@/lib/database/auth";
import { normalizePhone } from "@/lib/phone";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { listConversations } from "@/lib/whatsapp/messages";
import { WhatsAppClient } from "./components/WhatsAppClient";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const doctorId = await getCurrentDoctorId();
  const config = getWhatsAppConfig();
  const requested = (await searchParams).phone;
  const initialPhone =
    typeof requested === "string" ? normalizePhone(requested) : null;

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="pt-8 md:pt-0">
        <p className="text-sm font-medium text-brand">Patient messages</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
          WhatsApp
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {config.mode === "meta"
            ? `Conversations with your patients on ${config.displayNumber || "your WhatsApp number"}.`
            : "Demo mode: play a patient below to try the assistant. Nothing is sent to real phones."}
        </p>
      </div>
      <WhatsAppClient
        simulated={config.mode === "simulated"}
        initialConversations={listConversations(doctorId)}
        initialPhone={initialPhone}
      />
    </main>
  );
}
