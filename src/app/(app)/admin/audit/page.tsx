import Link from "next/link";
import { requireHR } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUDIT_ACTION_LABELS } from "@/lib/audit-constants";
import { AuditAction } from "@/generated/prisma/enums";
import {
  AuditBadge,
  Card,
  EmptyState,
  PageHeader,
  Stat,
  formatTimestamp,
} from "@/components/ui";
import { RequestFilters } from "./request-filters";

export const metadata = { title: "Activity" };

const PAGE_SIZE = 50;

type Filter = {
  action?: AuditAction;
  query: string;
};

/**
 * Data access lives outside the component so the relative window is evaluated
 * per request rather than during render.
 */
async function loadActivity({ action, query }: Filter) {
  const where = {
    ...(action ? { action } : {}),
    ...(query
      ? { OR: [{ summary: { contains: query } }, { actorName: { contains: query } }] }
      : {}),
  };

  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [entries, total, lastWeek, actors] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE }),
    db.auditLog.count({ where }),
    db.auditLog.count({ where: { createdAt: { gte: weekAgo } } }),
    db.auditLog.findMany({ where, select: { actorName: true }, distinct: ["actorName"] }),
  ]);

  return { entries, total, lastWeek, actorCount: actors.length };
}

export default async function AdminAuditPage(props: PageProps<"/admin/audit">) {
  await requireHR();

  const sp = await props.searchParams;
  const actionParam = typeof sp.action === "string" ? sp.action : "";
  const query = typeof sp.q === "string" ? sp.q.trim() : "";
  const action = Object.values(AuditAction).find((a) => a === actionParam);

  const { entries, total, lastWeek, actorCount } = await loadActivity({ action, query });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Activity"
        description="An append-only record of every change made in the app, newest first."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Matching events" value={total} hint="current filter" />
        <Stat label="Last 7 days" value={lastWeek} tone="brand" hint="across everyone" />
        <Stat label="Distinct actors" value={actorCount} hint="in this filter" />
      </div>

      <RequestFilters
        action={actionParam}
        query={query}
        actions={Object.entries(AUDIT_ACTION_LABELS)}
        searchPlaceholder="Search summaries or people..."
        resultCount={total}
        basePath="/admin/audit"
      />

      <Card padded={false}>
        {entries.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyState>No activity matches those filters yet.</EmptyState>
          </div>
        ) : (
          <ol className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                <AuditBadge action={entry.action} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900">{entry.summary}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {entry.actorName} &middot; {formatTimestamp(entry.createdAt)}
                    {entry.entityType && (
                      <>
                        {" "}
                        &middot;{" "}
                        <span className="font-mono text-[11px] text-slate-400">
                          {entry.entityType}
                          {entry.entityId ? `/${entry.entityId.slice(-6)}` : ""}
                        </span>
                      </>
                    )}
                  </p>
                  {entry.metadata && <MetadataDetails metadata={entry.metadata} />}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {entries.length === PAGE_SIZE && (
        <p className="text-sm text-slate-500">
          Showing the {PAGE_SIZE} most recent. Narrow the filter to see older events.
        </p>
      )}

      <p className="text-sm text-slate-500">
        Looking for allowances? Head to{" "}
        <Link href="/admin/balances" className="font-medium text-brand-700 underline">
          balances
        </Link>
        .
      </p>
    </div>
  );
}

function MetadataDetails({ metadata }: { metadata: string }) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(metadata);
  } catch {
    return null;
  }

  const changes = (parsed as { changes?: unknown }).changes;
  const entries = Array.isArray(changes)
    ? changes.map(String)
    : Object.entries((parsed ?? {}) as Record<string, unknown>).filter(
        ([, value]) => value !== null && value !== undefined,
      );

  if (entries.length === 0) return null;

  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {entries.map((entry) => (
        <li
          key={String(entry)}
          className="rounded-md bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-500"
        >
          {String(entry)}
        </li>
      ))}
    </ul>
  );
}
