import { Bell, ChevronDown, Search } from "lucide-react";

export function AppHeader() {
  return <header className="sticky top-0 z-30 flex h-[78px] items-center justify-end border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-3 sm:gap-5"><button aria-label="Search" className="hidden text-slate-400 sm:block"><Search size={21} /></button><button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-600"><Bell size={20} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500" /></button><div className="hidden h-8 w-px bg-slate-200 sm:block" /><button className="flex items-center gap-2 text-sm font-medium text-slate-700"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#dbeeea] font-semibold text-brand">DM</span><span className="hidden lg:block">Dr. Meera</span><ChevronDown size={16} /></button></div></header>;
}
