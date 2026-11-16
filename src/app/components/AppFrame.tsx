"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

export type FrameDoctor = {
  name: string;
  specialization: string;
  initials: string;
};

/** Routes that render on their own, without the sidebar and header. */
const BARE_ROUTES = new Set(["/login"]);

export function AppFrame({
  doctor,
  children,
}: {
  doctor: FrameDoctor | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  if (BARE_ROUTES.has(pathname) || !doctor) return <>{children}</>;

  return <>
    <Sidebar doctor={doctor} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
    <div className={`min-h-screen bg-mist transition-[padding] duration-300 ${collapsed ? "md:pl-[86px]" : "md:pl-[270px]"}`}>
      <AppHeader doctor={doctor} />
      {children}
    </div>
  </>;
}
