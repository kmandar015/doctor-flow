"use client";

import { BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/app/components/ToastContext";

/** Sends WhatsApp reminders for today's and tomorrow's visits and follow-ups. */
export function SendRemindersButton() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const send = () =>
    startTransition(async () => {
      const res = await fetch("/api/reminders", { method: "POST" });
      if (!res.ok) {
        showToast("Could not send reminders.", "error");
        return;
      }
      const { sent, failed } = (await res.json()) as { sent: number; failed: number };
      if (failed) showToast(`${sent} sent, ${failed} could not be delivered.`, "error");
      else if (sent) showToast(`${sent} WhatsApp ${sent === 1 ? "reminder" : "reminders"} sent.`);
      else showToast("No reminders due. Everyone is up to date.");
      router.refresh();
    });

  return (
    <button
      onClick={send}
      disabled={isPending}
      className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
    >
      <BellRing size={18} />
      {isPending ? "Sending…" : "Send reminders"}
    </button>
  );
}
