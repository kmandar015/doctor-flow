import { CalendarDays, CheckCircle2, Clock3, TrendingUp, Users } from "lucide-react";
import type { Stat } from "../types";

const iconMap = { calendar: CalendarDays, clock: Clock3, check: CheckCircle2, users: Users };
const tones = { teal: "bg-teal-50 text-brand", amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600", blue: "bg-blue-50 text-blue-600" };

export function StatsCards({ stats }: { stats: Stat[] }) {
  return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => { const Icon = iconMap[stat.icon]; return <article key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"><div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-xl ${tones[stat.tone]}`}><Icon size={21} /></span><span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600"><TrendingUp size={12} />{stat.trend}</span></div><p className="mt-5 text-2xl font-bold tracking-tight text-slate-800">{stat.value}</p><p className="mt-1 text-sm font-semibold text-slate-600">{stat.label}</p><p className="mt-2 text-xs text-slate-400">{stat.detail}</p></article>; })}</section>;
}
