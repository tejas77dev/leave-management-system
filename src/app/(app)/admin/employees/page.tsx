import { requireHR } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentYear } from "@/lib/leave-calc";
import { remainingDays } from "@/lib/leave-calc";
import { Card, PageHeader, RoleBadge, formatDays } from "@/components/ui";
import { CreateEmployeeForm, EmployeeRowForm } from "./employee-forms";

export const metadata = { title: "Employees" };

export default async function EmployeesPage(props: PageProps<"/admin/employees">) {
  const hr = await requireHR();
  const year = currentYear();

  const sp = await props.searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim() : "";

  const users = await db.user.findMany({
    where: query
      ? { OR: [{ name: { contains: query } }, { email: { contains: query } }] }
      : undefined,
    include: {
      balances: { where: { year } },
      _count: { select: { requests: true } },
    },
    orderBy: [{ role: "desc" }, { name: "asc" }],
  });

  const totalAccounts = await db.user.count();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Employees"
        description="Accounts, roles, and access. Employees request their own leave."
      />

      <Card title="Add an employee">
        <CreateEmployeeForm />
      </Card>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-soft">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="q" className="label">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by name or email..."
            className="field"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Apply
        </button>
        {query && (
          <a
            href="/admin/employees"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Reset
          </a>
        )}
        <p className="w-full text-xs text-slate-500" aria-live="polite">
          Showing {users.length} of {totalAccounts}{" "}
          {totalAccounts === 1 ? "account" : "accounts"}
        </p>
      </form>

      <Card title={`${query ? "Matching accounts" : "All accounts"} (${users.length})`}>
        <ul className="space-y-3">
          {users.map((user) => {
            const remaining = remainingDays({
              entitled: user.balances.reduce((sum, b) => sum + b.entitled, 0),
              used: user.balances.reduce((sum, b) => sum + b.used, 0),
              pending: user.balances.reduce((sum, b) => sum + b.pending, 0),
            });

            return (
              <li
                key={user.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <RoleBadge role={user.role} />
                  {!user.active && (
                    <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      Deactivated
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    <span className="tnum">{formatDays(remaining)}</span> day(s) left in {year} ·
                    <span className="tnum"> {user._count.requests}</span> request(s) all time
                  </span>
                </div>
                <EmployeeRowForm
                  isSelf={user.id === hr.id}
                  user={{
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    active: user.active,
                  }}
                />
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
