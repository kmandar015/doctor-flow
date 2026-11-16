import { BarChart3 } from "lucide-react";
import { ReportsClient } from "./components/ReportsClient";

export default function ReportsPage() {
  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="pt-8 md:pt-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl flex items-center gap-3">
          <BarChart3 size={28} className="text-brand" />
          Reports &amp; Insights
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Understand your practice activity with appointment, patient, and
          follow-up insights.
        </p>
      </div>
      <ReportsClient />
    </main>
  );
}
