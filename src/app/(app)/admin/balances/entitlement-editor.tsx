"use client";

import { useActionState } from "react";
import { setEntitlementAction } from "./actions";
import { initialActionState } from "@/lib/validation";
import { SubmitButton } from "@/components/submit-button";
import { ErrorBanner } from "@/components/ui";

export function EntitlementEditor({
  userId,
  leaveTypeId,
  year,
  entitled,
}: {
  userId: string;
  leaveTypeId: string;
  year: number;
  entitled: number;
}) {
  const [state, formAction] = useActionState(setEntitlementAction, initialActionState);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="leaveTypeId" value={leaveTypeId} />
      <input type="hidden" name="year" value={year} />
      <ErrorBanner message={state.error} />
      <div className="flex items-center gap-1.5">
        <input
          name="entitled"
          type="number"
          step="0.5"
          min="0"
          defaultValue={entitled}
          aria-label="Days entitled"
          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm tabular-nums outline-none focus:border-slate-900"
        />
        <SubmitButton variant="secondary" pendingLabel="..." className="px-2 py-1 text-xs">
          Set
        </SubmitButton>
      </div>
    </form>
  );
}
