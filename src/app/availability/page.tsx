import { AvailabilityClient } from "./components/AvailabilityClient";

export default function AvailabilityPage() {
  return (
    <main className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="pt-8 md:pt-0">
        <p className="text-sm font-medium text-brand">Settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
          Availability
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage your working hours, working days, and breaks.
        </p>
      </div>
      <div className="mt-7">
        <AvailabilityClient />
      </div>
    </main>
  );
}
