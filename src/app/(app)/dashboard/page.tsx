import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMyBalances } from "@/lib/leave-service";
import { currentYear } from "@/lib/leave-calc";
import { RequestStatus } from "@/generated/prisma/enums";
import {
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  Stat,
  StatusBadge,
  formatDateRange,
  formatDays,
} from "@/components/ui";

function BalanceTile({
  name,
  entitled,
  used,
  pending,
  remaining,
}: {
  name: string;
  entitled: number;
  used: number;
  pending: number;
  remaining: number;
}) {
  const consumed = used + pending;
  const tone = remaining <= 0 ? "rose" : pending > 0 && remaining <= 2 ? "amber" : "brand";

  return (
    <div
      data-testid="balance-tile"
      data-leave-type={name}
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft transition-shadow hover:shadow-lift"
    >
      <p className="truncate text-sm font-medium text-slate-700">{name}</p>
      <p className="tnum mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        {formatDays(remaining)}
        <span className="ml-1 text-sm font-normal text-slate-400">left</span>
      </p>

      <div className="mt-3">
        <ProgressBar value={consumed} total={entitled} tone={tone} />
      </div>

      <dl className="mt-3 flex gap-4 text-xs text-slate-500">
        <div>
          <dt className="inline">Entitled </dt>
          <dd className="tnum inline">{formatDays(entitled)}</dd>
        </div>
        <div>
          <dt className="inline">Used </dt>
          <dd className="tnum inline">{formatDays(used)}</dd>
        </div>
        <div>
          <dt className="inline">Pending </dt>
          <dd className="tnum inline">{formatDays(pending)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const year = currentYear();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const balances = await getMyBalances(user.id, year);
  const isHR = user.role === "HR";

  const [recent, pendingCount, offToday, approvedCount] = await Promise.all([
    db.leaveRequest.findMany({
      where: { userId: user.id },
      include: { leaveType: true, reviewedBy: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    isHR
      ? db.leaveRequest.count({ where: { status: RequestStatus.PENDING } })
      : Promise.resolve(0),
    isHR
      ? db.leaveRequest.findMany({
          where: {
            status: RequestStatus.APPROVED,
            startDate: { lte: today },
            endDate: { gte: today },
          },
          include: { user: true, leaveType: true },
          orderBy: { user: { name: "asc" } },
        })
      : Promise.resolve([]),
    isHR
      ? db.leaveRequest.count({ where: { status: RequestStatus.APPROVED } })
      : Promise.resolve(0),
  ]);

  const totalRemaining = balances.reduce((sum, b) => sum + b.remaining, 0);
  const totalEntitled = balances.reduce((sum, b) => sum + b.entitled, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${year} season`}
        title={`Hello, ${user.name.split(" ")[0]}`}
        description={
          isHR
            ? "Your own balances, plus what needs your attention across the team."
            : "Your leave balances and recent activity."
        }
        action={
          <Link
            href="/requests/new"
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Request leave
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total remaining"
          value={`${formatDays(totalRemaining)}d`}
          hint={`of ${formatDays(totalEntitled)}d entitled`}
          tone="brand"
        />
        <Stat label="Awaiting approval" value={isHR ? pendingCount : "—"} tone="amber" />
        <Stat label="Approved" value={isHR ? approvedCount : "—"} tone="emerald" />
        <Stat label="Off today" value={isHR ? offToday.length : "—"} />
      </div>

      <Card title={`${year} balances`} description="Weekends do not consume balance.">
        {balances.length === 0 ? (
          <EmptyState>No active leave types are configured yet.</EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((balance) => (
              <BalanceTile
                key={balance.leaveType.id}
                name={balance.leaveType.name}
                entitled={balance.entitled}
                used={balance.used}
                pending={balance.pending}
                remaining={balance.remaining}
              />
            ))}
          </div>
        )}
      </Card>

      {isHR && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="Awaiting your approval"
            description="Requests that still need a decision."
            action={
              <Link
                href="/admin/requests"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Review
              </Link>
            }
          >
            <p className="tnum text-4xl font-semibold tracking-tight text-slate-900">
              {pendingCount}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {pendingCount === 1 ? "request" : "requests"} waiting
            </p>
          </Card>

          <Card title="Off today" description="Approved leave covering today.">
            {offToday.length === 0 ? (
              <EmptyState>Everyone is in today.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {offToday.map((request) => (
                  <li key={request.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{request.user.name}</p>
                      <p className="text-xs text-slate-500">
                        {request.leaveType.name} &middot; {formatDays(request.days)} day(s)
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Card
        title="Recent requests"
        action={
          <Link href="/requests" className="text-sm font-medium text-brand-700 hover:underline">
            View all
          </Link>
        }
      >
        {recent.length === 0 ? (
          <EmptyState>
            You have not requested any leave yet.{" "}
            <Link href="/requests/new" className="font-medium text-brand-700 underline">
              Make your first request
            </Link>
            .
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {request.leaveType.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateRange(
                      request.startDate,
                      request.endDate,
                      request.isHalfDay,
                      request.partOfDay,
                    )}{" "}
                    &middot; {formatDays(request.days)} day(s)
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
