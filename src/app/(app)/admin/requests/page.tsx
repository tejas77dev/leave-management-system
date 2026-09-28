import Link from "next/link";
import { requireHR } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentYear } from "@/lib/leave-calc";
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
  formatTimestamp,
} from "@/components/ui";
import { ReviewControls } from "./review-controls";
import { RequestFilters } from "../audit/request-filters";

export const metadata = { title: "Approvals" };

const DECIDED_TAKE = 25;

export default async function AdminRequestsPage(props: PageProps<"/admin/requests">) {
  const hr = await requireHR();
  const sp = await props.searchParams;

  const statusParam = typeof sp.status === "string" ? sp.status : "";
  const typeParam = typeof sp.type === "string" ? sp.type : "";
  const query = typeof sp.q === "string" ? sp.q.trim() : "";

  const status = Object.values(RequestStatus).find((s) => s === statusParam);

  // `q` matches the employee's name or email; `type` narrows to one leave type.
  const baseWhere = {
    ...(typeParam ? { leaveTypeId: typeParam } : {}),
    ...(query
      ? { user: { OR: [{ name: { contains: query } }, { email: { contains: query } }] } }
      : {}),
  };

  // The status filter has to decide which sections can show anything at all,
  // otherwise picking "Rejected" would still list the pending queue.
  const showPending = !status || status === RequestStatus.PENDING;
  const decidedStatus = {
    ...(status && status !== RequestStatus.PENDING ? { status } : {}),
    ...(status !== RequestStatus.PENDING
      ? {}
      : { status: { in: [RequestStatus.APPROVED, RequestStatus.REJECTED] } }),
  };
  const showDecided = !status || status !== RequestStatus.PENDING;

  const [pending, decided, leaveTypes, pendingCount, approvedCount, rejectedCount] =
    await Promise.all([
      showPending
        ? db.leaveRequest.findMany({
            where: { ...baseWhere, status: RequestStatus.PENDING },
            include: { user: true, leaveType: true },
            orderBy: { startDate: "asc" },
          })
        : Promise.resolve([]),
      showDecided
        ? db.leaveRequest.findMany({
            where: { ...baseWhere, ...decidedStatus },
            include: { user: true, leaveType: true, reviewedBy: true },
            orderBy: { reviewedAt: "desc" },
            take: DECIDED_TAKE,
          })
        : Promise.resolve([]),
      db.leaveType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      db.leaveRequest.count({ where: { status: RequestStatus.PENDING } }),
      db.leaveRequest.count({ where: { status: RequestStatus.APPROVED } }),
      db.leaveRequest.count({ where: { status: RequestStatus.REJECTED } }),
    ]);

  const filtered = Boolean(status || typeParam || query);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Approvals"
        description={`Requests waiting on a decision, plus the ${currentYear()} decision history.`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Awaiting decision" value={pendingCount} tone="amber" />
        <Stat label="Approved" value={approvedCount} tone="emerald" />
        <Stat label="Rejected" value={rejectedCount} tone="rose" />
      </div>

      <RequestFilters
        status={statusParam}
        type={typeParam}
        query={query}
        types={leaveTypes}
        resultCount={pending.length + decided.length}
        basePath="/admin/requests"
      />

      <Card title={`Awaiting decision (${pending.length})`}>
        {pending.length === 0 ? (
          <EmptyState>
            {filtered ? "No pending requests match those filters." : "Nothing is waiting for review."}
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {pending.map((request) => (
              <li
                key={request.id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 transition-shadow hover:shadow-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {request.user.name}
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        {request.leaveType.name}
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {formatDateRange(
                        request.startDate,
                        request.endDate,
                        request.isHalfDay,
                        request.partOfDay,
                      )}{" "}
                      &middot; <span className="tnum">{formatDays(request.days)}</span> day(s)
                    </p>
                    {request.reason && (
                      <p className="mt-1.5 text-sm italic text-slate-500">
                        &ldquo;{request.reason}&rdquo;
                      </p>
                    )}
                  </div>
                  <StatusBadge status={request.status} />
                </div>

                {request.userId === hr.id ? (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    This is your own request, so you cannot review it.
                  </p>
                ) : (
                  <div className="mt-3 max-w-sm">
                    <ReviewControls requestId={request.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent decisions">
        {decided.length === 0 ? (
          <EmptyState>
            {filtered ? "No decisions match those filters." : "No decisions recorded yet."}
          </EmptyState>
        ) : (
          <Table
            head={["Employee", "Type", "Dates", "Days", "Status", "Reviewer", "Decided"]}
            minWidth={860}
          >
            {decided.map((request) => (
              <tr key={request.id} className="transition-colors hover:bg-slate-50/60">
                <td className="py-2.5 pr-4 font-medium text-slate-900">{request.user.name}</td>
                <td className="py-2.5 pr-4 text-slate-600">{request.leaveType.name}</td>
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
                <td className="py-2.5 pr-4 text-slate-600">{request.reviewedBy?.name ?? "—"}</td>
                <td className="py-2.5 text-slate-500">
                  {request.reviewedAt ? formatTimestamp(request.reviewedAt) : "—"}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <p className="text-sm text-slate-500">
        Need to change allowances? Head to{" "}
        <Link href="/admin/balances" className="font-medium text-brand-700 underline">
          balances
        </Link>
        .
      </p>
    </div>
  );
}
