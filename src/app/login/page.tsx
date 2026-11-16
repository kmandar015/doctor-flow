import { Stethoscope } from "lucide-react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · DoctorFlow" };

/** Only same-site paths are allowed as the post-login destination. */
function safeNext(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const next = safeNext((await searchParams).next);

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-5 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-white">
            <Stethoscope size={24} strokeWidth={2.5} />
          </span>
          <span className="text-2xl font-semibold tracking-tight text-ink">
            DoctorFlow
          </span>
        </div>
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
          <p className="text-sm font-medium text-brand">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage your appointments, patients and follow-ups.
          </p>
          <LoginForm next={next} />
        </section>
      </div>
    </main>
  );
}
