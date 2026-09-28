import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "./actions";
import { NavLinks, type NavItem } from "./nav-links";
import { SubmitButton } from "@/components/submit-button";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  const isHR = user.role === "HR";

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/requests", label: "My leave" },
    { href: "/requests/new", label: "Request leave" },
  ];

  const hrItems: NavItem[] = [
    { href: "/admin/requests", label: "Approvals" },
    { href: "/admin/employees", label: "Employees" },
    { href: "/admin/leave-types", label: "Leave types" },
    { href: "/admin/balances", label: "Balances" },
    { href: "/admin/audit", label: "Activity" },
  ];

  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <aside className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-slate-200/80 bg-white/85 backdrop-blur lg:h-screen lg:w-64 lg:flex-col lg:items-stretch lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 lg:px-5 lg:py-5">
          <a
            href="/dashboard"
            className="flex items-center gap-2.5 text-slate-900 no-underline"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[13px] font-bold text-white shadow-sm">
              LM
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Leave Manager</span>
          </a>
          <div className="lg:hidden">
            <UserChip initials={initials} role={user.role} name={user.name} compact />
          </div>
        </div>

        <nav className="hidden flex-1 overflow-y-auto px-3 lg:block">
          <NavLinks items={items} />
          {isHR && (
            <>
              <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Administration
              </p>
              <NavLinks items={hrItems} />
            </>
          )}
        </nav>

        {/* Mobile nav */}
        <div className="w-full overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden">
          <NavLinks items={[...items, ...(isHR ? hrItems : [])]} horizontal />
        </div>

        <div className="hidden border-t border-slate-100 p-3 lg:block">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <UserChip initials={initials} role={user.role} name={user.name} />
            <form action={logoutAction} className="ml-auto">
              <SubmitButton variant="ghost" pendingLabel="..." title="Sign out">
                <span aria-hidden>⏻</span>
              </SubmitButton>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

function UserChip({
  initials,
  name,
  role,
  compact = false,
}: {
  initials: string;
  name: string;
  role: "EMPLOYEE" | "HR";
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
      >
        {initials}
      </span>
      <div className={compact ? "hidden" : "min-w-0 leading-tight"}>
        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">{role === "HR" ? "HR administrator" : "Employee"}</p>
      </div>
    </div>
  );
}
