"use client";

import { useActionState } from "react";
import { reviewRequestAction } from "./actions";
import { initialActionState } from "@/lib/validation";
import { SubmitButton } from "@/components/submit-button";
import { ErrorBanner } from "@/components/ui";

export function ReviewControls({ requestId }: { requestId: string }) {
  const [state, formAction] = useActionState(reviewRequestAction, initialActionState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      <ErrorBanner message={state.error} />

      <label htmlFor={`note-${requestId}`} className="sr-only">
        Review note
      </label>
      <input
        id={`note-${requestId}`}
        name="reviewNote"
        placeholder="Add a note (optional)"
        maxLength={500}
        className="field"
      />

      <div className="flex gap-2">
        <SubmitButton
          variant="approve"
          size="sm"
          name="decision"
          value="APPROVED"
          pendingLabel="..."
          className="flex-1"
        >
          Approve
        </SubmitButton>
        <SubmitButton
          variant="reject"
          size="sm"
          name="decision"
          value="REJECTED"
          pendingLabel="..."
          className="flex-1"
        >
          Reject
        </SubmitButton>
      </div>
    </form>
  );
}
