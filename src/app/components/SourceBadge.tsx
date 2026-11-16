import { MessageCircle } from "lucide-react";

export const sourceLabel: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  DASHBOARD: "Dashboard",
  MANUAL: "Manual entry",
};

/** Marks appointments that patients booked through the WhatsApp assistant. */
export function SourceBadge({ source }: { source?: string }) {
  if (source !== "WHATSAPP") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700">
      <MessageCircle size={12} strokeWidth={2.5} />
      WhatsApp
    </span>
  );
}
