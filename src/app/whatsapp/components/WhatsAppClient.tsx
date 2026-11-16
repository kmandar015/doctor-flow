"use client";

import { MessageCircle, Send, UserRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { WhatsAppBubble, type BubbleMessage } from "@/app/components/WhatsAppBubble";
import { useToast } from "@/app/components/ToastContext";
import { formatPhone, normalizePhone } from "@/lib/phone";

type Conversation = {
  phone: string;
  patientId: string | null;
  patientName: string | null;
  lastBody: string;
  lastDirection: "IN" | "OUT";
  lastAt: string;
  messageCount: number;
};

type Message = BubbleMessage & { patientId: string | null; patientName: string | null };

const QUICK_REPLIES = ["Hi", "1", "2", "3", "4", "5", "0"];
const POLL_MS = 4000;

const relativeTime = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h` : `${Math.round(hours / 24)} d`;
};

export function WhatsAppClient({
  simulated,
  initialConversations,
  initialPhone,
}: {
  simulated: boolean;
  initialConversations: Conversation[];
  initialPhone: string | null;
}) {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(
    initialPhone ?? initialConversations[0]?.phone ?? null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newNumberError, setNewNumberError] = useState("");
  const [isSending, startSending] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/whatsapp/messages");
    if (res.ok) setConversations((await res.json()).conversations);
  }, []);

  // Keep the open conversation and the list fresh, so real patient messages
  // appear without reloading the page.
  useEffect(() => {
    let cancelled = false;
    const refresh = (withList: boolean) => {
      if (selectedPhone) {
        fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(selectedPhone)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && !cancelled) setMessages(data.messages);
          })
          .catch(() => {});
      }
      if (withList) {
        fetch("/api/whatsapp/messages")
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && !cancelled) setConversations(data.conversations);
          })
          .catch(() => {});
      }
    };
    refresh(false);
    const timer = setInterval(() => refresh(true), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selectedPhone]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const selected = conversations.find((c) => c.phone === selectedPhone);
  const title = selected?.patientName ?? messages.find((m) => m.patientName)?.patientName;
  const patientId = selected?.patientId ?? messages.find((m) => m.patientId)?.patientId;

  const send = (text: string) => {
    if (!selectedPhone || !text.trim()) return;
    startSending(async () => {
      const res = await fetch("/api/whatsapp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedPhone, text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error ?? "Could not send the message.", "error");
        return;
      }
      setDraft("");
      setMessages((await res.json()).messages);
      await loadConversations();
    });
  };

  const startConversation = (event: React.FormEvent) => {
    event.preventDefault();
    const phone = normalizePhone(newNumber);
    if (!phone) {
      setNewNumberError("Enter a valid phone number.");
      return;
    }
    setNewNumberError("");
    setNewNumber("");
    setMessages([]);
    setSelectedPhone(phone);
  };

  return (
    <div className="mt-7 grid gap-5 lg:grid-cols-[340px_1fr]">
      {/* Conversations */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-800">Conversations</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {conversations.length} {conversations.length === 1 ? "patient" : "patients"}
          </p>
        </div>
        {simulated && (
          <form onSubmit={startConversation} className="border-b border-slate-100 px-5 py-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Play a patient from this number
            </label>
            <div className="flex gap-2">
              <input
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="e.g. +91 98765 00000"
                inputMode="tel"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-brand/30 ${
                  newNumberError ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
                }`}
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
              >
                Start
              </button>
            </div>
            {newNumberError && <p className="mt-1 text-xs text-rose-500">{newNumberError}</p>}
          </form>
        )}
        <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.phone}
              onClick={() => setSelectedPhone(c.phone)}
              className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 ${
                c.phone === selectedPhone ? "bg-teal-50/60" : ""
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green-50 text-green-700">
                <UserRound size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-700">
                    {c.patientName ?? formatPhone(c.phone)}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{relativeTime(c.lastAt)}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-400">
                  {c.lastDirection === "OUT" ? "You: " : ""}
                  {c.lastBody.replace(/\*/g, "")}
                </span>
              </span>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-slate-400">
              No WhatsApp messages yet.
            </p>
          )}
        </div>
      </section>

      {/* Chat */}
      <section className="flex h-[75vh] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card lg:h-[680px]">
        {selectedPhone ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate font-bold text-slate-800">
                  {title ?? "New patient"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-400">{formatPhone(selectedPhone)}</p>
              </div>
              {patientId && (
                <Link
                  href={`/patients/${patientId}`}
                  className="shrink-0 text-sm font-semibold text-brand hover:text-teal-900"
                >
                  View patient record
                </Link>
              )}
            </div>
            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-[#efeae2] px-4 py-5 sm:px-6">
              {messages.map((m) => (
                <WhatsAppBubble key={m.id} message={m} />
              ))}
              {messages.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-500">
                  {simulated ? "Send “Hi” as the patient to start." : "No messages yet."}
                </p>
              )}
            </div>
            {simulated ? (
              <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map((text) => (
                    <button
                      key={text}
                      disabled={isSending}
                      onClick={() => send(text)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-60"
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(draft);
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type as the patient…"
                    aria-label="Message from the patient"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-brand/30"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !draft.trim()}
                    aria-label="Send"
                    className="grid w-12 shrink-0 place-items-center rounded-xl bg-brand text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            ) : (
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
                Patients chat with the assistant on WhatsApp. Messages appear here automatically.
              </p>
            )}
          </>
        ) : (
          <div className="grid flex-1 place-items-center px-6 text-center">
            <div>
              <MessageCircle className="mx-auto text-slate-300" size={36} />
              <p className="mt-3 text-sm text-slate-400">Choose a conversation.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
