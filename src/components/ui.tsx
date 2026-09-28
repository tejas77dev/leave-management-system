import type { ReactNode } from "react";
import type { AuditAction, RequestStatus } from "@/generated/prisma/enums";
import { AUDIT_ACTION_LABELS } from "@/lib/audit-constants";

/* -------------------------------------------------------------------------- */
/*  Surfaces                                                                  */
/* -------------------------------------------------------------------------- */

export function Card({
  title,
  description,
  action,
  padded = true,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft">
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
            )}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? "px-5 py-5" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">
          {title}
        </h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Badges                                                                    */
/* -------------------------------------------------------------------------- */

const STATUS_STYLES: Record<RequestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const STATUS_DOTS: Record<RequestStatus, string> = {
  PENDING: "bg-amber-500",
  APPROVED: "bg-emerald-500",
  REJECTED: "bg-rose-500",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status]}`} aria-hidden />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function RoleBadge({ role }: { role: "EMPLOYEE" | "HR" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        role === "HR"
          ? "bg-brand-50 text-brand-700 ring-brand-600/20"
          : "bg-slate-100 text-slate-600 ring-slate-500/15"
      }`}
    >
      {role === "HR" ? "HR" : "Employee"}
    </span>
  );
}

const AUDIT_TONES: Record<AuditAction, string> = {
  REQUEST_SUBMITTED: "bg-sky-50 text-sky-700 ring-sky-600/20",
  REQUEST_APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REQUEST_REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/20",
  EMPLOYEE_CREATED: "bg-brand-50 text-brand-700 ring-brand-600/20",
  EMPLOYEE_UPDATED: "bg-brand-50 text-brand-700 ring-brand-600/20",
  LEAVE_TYPE_CREATED: "bg-violet-50 text-violet-700 ring-violet-600/20",
  LEAVE_TYPE_UPDATED: "bg-violet-50 text-violet-700 ring-violet-600/20",
  ENTITLEMENT_UPDATED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PASSWORD_CHANGED: "bg-slate-100 text-slate-600 ring-slate-500/15",
};

export function AuditBadge({ action }: { action: AuditAction }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${AUDIT_TONES[action]}`}
    >
      {AUDIT_ACTION_LABELS[action]}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Feedback                                                                  */
/* -------------------------------------------------------------------------- */

export function EmptyState({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-12 text-center">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="text-sm text-slate-500">{children}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      data-testid="form-error"
      className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800"
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
        className="mt-0.5 h-4 w-4 shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 5a1 1 0 012 0v4a1 1 0 11-2 0V5zm1 10a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 15z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </p>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
        className="mt-0.5 h-4 w-4 shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l3-3z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </p>
  );
}

export function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-rose-600">{message}</p>;
}

/* -------------------------------------------------------------------------- */
/*  Data display                                                              */
/* -------------------------------------------------------------------------- */

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "brand" | "amber" | "emerald" | "rose";
}) {
  const tones = {
    default: "text-slate-900",
    brand: "text-brand-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
  } as const;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`tnum mt-1.5 text-2xl font-semibold tracking-tight ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** Horizontal usage meter; `value` and `total` are in days. */
export function ProgressBar({
  value,
  total,
  tone = "brand",
}: {
  value: number;
  total: number;
  tone?: "brand" | "amber" | "rose";
}) {
  const safeTotal = total > 0 ? total : 0;
  const pct = safeTotal > 0 ? Math.min(100, Math.max(0, (value / safeTotal) * 100)) : 0;
  const tones = {
    brand: "bg-brand-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  } as const;

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={Number(pct.toFixed(0))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${tones[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Table({
  head,
  children,
  minWidth = 640,
}: {
  head: string[];
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-slate-200">
            {head.map((label) => (
              <th
                key={label}
                className="whitespace-nowrap pb-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function formatDays(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatDateRange(
  startDate: Date,
  endDate: Date,
  isHalfDay: boolean,
  partOfDay: "MORNING" | "AFTERNOON" | null,
): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const start = fmt.format(startDate);
  if (isHalfDay) {
    return `${start} (${partOfDay === "AFTERNOON" ? "afternoon" : "morning"} half-day)`;
  }
  const sameDay = startDate.getTime() === endDate.getTime();
  return sameDay ? start : `${start} to ${fmt.format(endDate)}`;
}

export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}
