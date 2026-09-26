import { FollowUpsClient } from "./components/FollowUpsClient";
import { getCurrentDoctorId } from "@/lib/database/auth";
import { listFollowUps } from "@/lib/database/followUps";

export const dynamic = "force-dynamic";

export default function FollowUpsPage() {
  const followUps = listFollowUps(getCurrentDoctorId());

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
          Follow-ups
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage your pending and upcoming patient follow-ups.
        </p>
      </div>
      <FollowUpsClient initialFollowUps={followUps} />
    </main>
  );
}
