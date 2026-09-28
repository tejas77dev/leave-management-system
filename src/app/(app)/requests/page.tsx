import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentYear, startOfYear, endOfYear } from "@/lib/leave-calc";
import { RequestStatus } from "@/generated/prisma/enums";
import {
  Card,
  EmptyState,
  PageHeader,
  Stat,
  StatusBadge,
  Table,
  formatDateRange,
  formatDays,
} from "@/components/ui";
import Link from "next/link";

export const metadata = { title: "My leave" };

export default async function MyRequestsPage() {
  const user = await requireUser();
  const year = currentYear();

  const requests = await db.leaveRequest.findMany({
    where: {
      userId: user.id,
      startDate: { gte: new Date(startOfYear(year).getTime() - 31_536_000_000) },
      endDate: { lte: endOfYear(year) },
    },
    include: { leaveType: true, reviewedBy: true },
    orderBy: { startDate: "desc" },
  });

  const totals = requests.reduce(
    (acc, request) => {
      if (request.status === RequestStatus.APPROVED) acc.approved += request.days;
      if (request.status === RequestStatus.PENDING) acc.pending += request.days;
      if (request.status === RequestStatus.REJECTED) acc.rejected += request.days;
      return acc;
    },
    { approved: 0, pending: 0, rejected: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${year}`}
        title="My leave"
        description="Every request touching this year, newest first."
        action={
          <Link
            href="/requests/new"
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Request leave
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Approved days" value={formatDays(totals.approved)} tone="emerald" />
        <Stat label="Pending days" value={formatDays(totals.pending)} tone="amber" />
        <Stat label="Rejected days" value={formatDays(totals.rejected)} tone="rose" />
      </div>

      <Card>
        {requests.length === 0 ? (
          <EmptyState>
            Nothing here yet.{" "}
            <Link href="/requests/new" className="font-medium text-brand-700 underline">
              Request leave
            </Link>
            .
          </EmptyState>
        ) : (
          <Table head={["Type", "Dates", "Days", "Status", "Decided by"]}>
            {requests.map((request) => (
              <tr key={request.id} className="transition-colors hover:bg-slate-50/60">
                <td className="py-2.5 pr-4 font-medium text-slate-900">{request.leaveType.name}</td>
                <td className="py-2.5 pr-4 text-slate-600">
                  {formatDateRange(
                    request.startDate,
                    request.endDate,
                    request.isHalfDay,
                    request.partOfDay,
                  )}
                </td>
                <td className="tnum py-2.5 pr-4 text-slate-600">{formatDays(request.days)}</td>
                <td className="py-2.5 pr-4">
                  <StatusBadge status={request.status} />
                </td>
                <td className="py-2.5 text-slate-600">
                  {request.reviewedBy ? request.reviewedBy.name : "—"}
                  {request.reviewNote && (
                    <span className="block text-xs italic text-slate-400">{request.reviewNote}</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
