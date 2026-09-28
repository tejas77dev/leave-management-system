import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel, hidden on small screens so the form stays front and centre. */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-sm font-bold backdrop-blur">
            LM
          </span>
          <span className="text-base font-semibold tracking-tight">Leave Manager</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Time off, without the paperwork.
          </h1>
          <p className="mt-3 text-brand-100">
            Request leave against your annual balance, and let HR approve it in one place. Every
            decision is recorded.
          </p>
          <ul className="mt-8 space-y-2.5 text-sm text-brand-50">
            {[
              "Weekends are never deducted",
              "Half-days supported (0.5 day)",
              "Pending days are reserved instantly",
            ].map((point) => (
              <li key={point} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-[11px]"
                >
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200">
          Accounts are created by your HR administrator.
        </p>
      </aside>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <span className="inline-grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
              LM
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
              Sign in
            </h1>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-1 mb-6 text-sm text-slate-500">
              Sign in to request or approve leave.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lift">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
