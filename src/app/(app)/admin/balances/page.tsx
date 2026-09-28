import { requireHR } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentYear } from "@/lib/leave-calc";
import { Card, EmptyState, PageHeader, formatDays } from "@/components/ui";
import { EntitlementEditor } from "./entitlement-editor";

export const metadata = { title: "Balances" };

export default async function BalancesPage() {
  await requireHR();
  const year = currentYear();

  const [leaveTypes, users] = await Promise.all([
    db.leaveType.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({
      include: { balances: { where: { year } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title={`${year} balances`}
        description="Adjust a yearly allowance. Entitlement cannot drop below what is already used or pending."
      />

      <Card>
        {leaveTypes.length === 0 || users.length === 0 ? (
          <EmptyState>Add leave types and employees first.</EmptyState>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Employee</th>
                    {leaveTypes.map((type) => (
                      <th key={type.id} className="pb-2 pr-4 font-medium">
                        {type.name}
                        <span className="block font-normal normal-case text-slate-400">
                          entitled / used / pending
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 align-top">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>
                      {leaveTypes.map((type) => {
                        const balance = user.balances.find(
                          (b) => b.leaveTypeId === type.id,
                        );
                        return (
                          <td key={type.id} className="py-3 pr-4">
                            {balance ? (
                              <>
                                <p className="text-xs tabular-nums text-slate-500">
                                  {formatDays(balance.entitled)} /{" "}
                                  {formatDays(balance.used)} / {formatDays(balance.pending)}
                                </p>
                                <EntitlementEditor
                                  userId={user.id}
                                  leaveTypeId={type.id}
                                  year={year}
                                  entitled={balance.entitled}
                                />
                              </>
                            ) : (
                              <span className="text-xs text-slate-400">not set</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500">
              Balances reset each January to the leave type default. Rows appear once an employee
              has a balance for that type in {year}.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
