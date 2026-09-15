"use client";

import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return <>
    <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
    <div className={`min-h-screen bg-mist transition-[padding] duration-300 ${collapsed ? "md:pl-[86px]" : "md:pl-[270px]"}`}>
      <AppHeader />
      {children}
    </div>
  </>;
}
