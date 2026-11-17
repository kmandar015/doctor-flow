"use client";

import { ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FrameDoctor } from "./AppFrame";

export function AppHeader({ doctor }: { doctor: FrameDoctor }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event instanceof MouseEvent &&
        menuRef.current?.contains(event.target as Node)
      )
        return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-[78px] items-center justify-end border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8">
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 text-sm font-medium text-slate-700"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#dbeeea] font-semibold text-brand">
              {doctor.initials}
            </span>
            <span className="hidden lg:block">{doctor.name}</span>
            <ChevronDown
              size={16}
              className={`transition ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5 shadow-card"
            >
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {doctor.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {doctor.specialization}
                </p>
              </div>
              <Link
                role="menuitem"
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Settings size={16} /> My account
              </Link>
              <button
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
