import { requireHR } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader, formatDays } from "@/components/ui";
import { CreateLeaveTypeForm, EditLeaveTypeForm } from "./leave-type-forms";

export const metadata = { title: "Leave types" };

export default async function LeaveTypesPage() {
  await requireHR();

  const leaveTypes = await db.leaveType.findMany({
    include: { _count: { select: { requests: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Leave types"
        description="Default days apply to new employees and to each new calendar year."
      />

      <Card title="Add a leave type">
        <CreateLeaveTypeForm />
      </Card>

      <Card title={`Configured types (${leaveTypes.length})`}>
        <ul className="space-y-4">
          {leaveTypes.map((leaveType) => (
            <li key={leaveType.id} className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 text-xs text-slate-500">
                {formatDays(leaveType.defaultDays)} day(s) per year &middot;{" "}
                {leaveType._count.requests} request(s) on record
                {!leaveType.active && " · inactive"}
              </p>
              <EditLeaveTypeForm leaveType={leaveType} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
