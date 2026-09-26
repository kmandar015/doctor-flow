"use client";

import {
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Stethoscope,
  Users,
  X,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Bookings", icon: ClipboardList, href: "/bookings" },
  { label: "Calendar", icon: CalendarDays, href: "/calendar" },
  { label: "Patients", icon: Users, href: "/patients" },
  { label: "Follow-ups", icon: ClipboardList, href: "/follow-ups" },
  { label: "Availability", icon: Clock, href: "/availability" },
  { label: "My Account", icon: Settings, href: "/account" },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-xl bg-ink text-white shadow-lg md:hidden"
      >
        <Menu size={21} />
      </button>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/35 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex bg-ink py-6 text-white transition-[width,transform] duration-300 md:translate-x-0 ${collapsed ? "w-[86px] px-3" : "w-[270px] px-5"} ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex w-full flex-col">
          <div
            className={`mb-11 flex items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand">
                <Stethoscope size={23} strokeWidth={2.5} />
              </span>
              <span
                className={`text-xl font-semibold tracking-tight ${collapsed ? "hidden" : ""}`}
              >
                DoctorFlow
              </span>
            </div>
            <button
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="md:hidden"
            >
              <X size={22} />
            </button>
          </div>
          <button
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggle}
            className="absolute -right-3 top-8 hidden h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-brand md:grid"
          >
            {collapsed ? (
              <PanelLeftOpen size={15} />
            ) : (
              <PanelLeftClose size={15} />
            )}
          </button>
          <p
            className={`mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-teal-100/45 ${collapsed ? "sr-only" : ""}`}
          >
            Main menu
          </p>
          <nav className="space-y-1.5">
            {items.map(({ label, icon: Icon, href }) => {
              const active = pathname === href;
              return (
                <Link
                  title={collapsed ? label : undefined}
                  onClick={() => setOpen(false)}
                  key={label}
                  href={href}
                  className={`flex items-center rounded-xl py-3 text-sm font-medium transition ${collapsed ? "justify-center px-3" : "gap-3 px-3"} ${active ? "bg-white/13 text-white shadow-sm" : "text-teal-50/65 hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                  <span className={collapsed ? "hidden" : ""}>{label}</span>
                </Link>
              );
            })}
          </nav>
          <div
            className={`mt-auto rounded-2xl bg-white/10 ${collapsed ? "p-2" : "p-4"}`}
          >
            <div
              className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-100 text-sm font-bold text-brand">
                DM
              </div>
              <div className={`min-w-0 ${collapsed ? "hidden" : ""}`}>
                <p className="truncate text-sm font-semibold">Dr. Meera Shah</p>
                <p className="mt-0.5 text-xs text-teal-50/55">
                  General Physician
                </p>
              </div>
              {!collapsed && (
                <ChevronLeft
                  className="ml-auto rotate-180 text-teal-50/60"
                  size={17}
                />
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
