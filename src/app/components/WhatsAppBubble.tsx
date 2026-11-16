import { Fragment } from "react";

export type BubbleMessage = {
  id: string;
  direction: "IN" | "OUT";
  kind: string;
  body: string;
  status: "RECEIVED" | "SENT" | "FAILED" | "SIMULATED";
  error?: string | null;
  createdAt: string;
};

const kindLabel: Record<string, string> = {
  BOOKING_REQUESTED: "Booking request",
  APPOINTMENT_CONFIRMED: "Confirmation",
  APPOINTMENT_REJECTED: "Declined",
  APPOINTMENT_CANCELLED: "Cancellation",
  APPOINTMENT_RESCHEDULED: "Rescheduled",
  APPOINTMENT_COMPLETED: "Thank you",
  APPOINTMENT_REMINDER: "Reminder",
  FOLLOW_UP_SCHEDULED: "Follow-up",
  FOLLOW_UP_REMINDER: "Follow-up reminder",
  WELCOME: "Welcome",
};

/** WhatsApp-style *bold* inside a message. */
function renderBody(body: string) {
  return body.split(/(\*[^*\n]+\*)/g).map((part, index) =>
    part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
      <strong key={index}>{part.slice(1, -1)}</strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

const timeFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: process.env.NEXT_PUBLIC_CLINIC_TIME_ZONE || "Asia/Kolkata",
});

export function WhatsAppBubble({
  message,
  compact = false,
}: {
  message: BubbleMessage;
  compact?: boolean;
}) {
  const outgoing = message.direction === "OUT";
  const label = kindLabel[message.kind];
  return (
    <div className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${compact ? "text-xs" : "text-sm"} ${
          outgoing
            ? "rounded-br-md bg-[#dcf8c6] text-slate-800"
            : "rounded-bl-md border border-slate-100 bg-white text-slate-700"
        }`}
      >
        {label && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand">
            {label}
          </p>
        )}
        <p className="whitespace-pre-line break-words">{renderBody(message.body)}</p>
        <p
          className={`mt-1 text-right text-[11px] ${message.status === "FAILED" ? "text-rose-600" : "text-slate-400"}`}
          title={message.error ?? undefined}
        >
          {timeFormat.format(new Date(message.createdAt))}
          {outgoing &&
            (message.status === "FAILED"
              ? " · not delivered"
              : message.status === "SIMULATED"
                ? " · demo"
                : " · sent")}
        </p>
      </div>
    </div>
  );
}
