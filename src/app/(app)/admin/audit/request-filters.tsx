import { RequestStatus } from "@/generated/prisma/enums";

/**
 * A plain GET form: filters live in the URL so a view can be shared, bookmarked
 * and restored by the back button without any client state.
 */
export function RequestFilters({
  status,
  action,
  query,
  type,
  types,
  actions,
  searchPlaceholder,
  resultCount,
  basePath,
}: {
  status?: string;
  action?: string;
  query?: string;
  type?: string;
  types?: { id: string; name: string }[];
  actions?: [string, string][];
  searchPlaceholder?: string;
  resultCount: number;
  basePath: string;
}) {
  const hasFilters = Boolean(status || action || query || type);

  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-soft"
    >
      <div className="min-w-[12rem] flex-1">
        <label htmlFor="q" className="label">
          Search
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query ?? ""}
          placeholder={searchPlaceholder ?? "Search by name or email..."}
          className="field"
        />
      </div>

      {status !== undefined && (
        <div className="w-40">
          <label htmlFor="status" className="label">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="field">
            <option value="">All statuses</option>
            {Object.values(RequestStatus).map((value) => (
              <option key={value} value={value}>
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      )}

      {action !== undefined && (
        <div className="w-48">
          <label htmlFor="action" className="label">
            Event
          </label>
          <select id="action" name="action" defaultValue={action} className="field">
            <option value="">All events</option>
            {actions?.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {type !== undefined && (
        <div className="w-44">
          <label htmlFor="type" className="label">
            Leave type
          </label>
          <select id="type" name="type" defaultValue={type} className="field">
            <option value="">All types</option>
            {types?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Apply
        </button>
        {hasFilters && (
          <a
            href={basePath}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Reset
          </a>
        )}
      </div>

      <p className="w-full text-xs text-slate-500" aria-live="polite">
        {resultCount} matching {resultCount === 1 ? "record" : "records"}
      </p>
    </form>
  );
}
