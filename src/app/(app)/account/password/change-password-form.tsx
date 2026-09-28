"use client";

import { useActionState } from "react";
import { changePasswordAction } from "./actions";
import { initialActionState } from "@/lib/validation";
import { SubmitButton } from "@/components/submit-button";
import { ErrorBanner, FieldError, SuccessBanner } from "@/components/ui";

const inputClass = "field";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialActionState);
  const saved = state.success === true;

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state.error} />
      {saved && <SuccessBanner message="Your password has been updated." />}

      <div>
        <label htmlFor="currentPassword" className="label">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
        <FieldError message={state.fieldErrors.currentPassword} />
      </div>

      <div>
        <label htmlFor="newPassword" className="label">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
        <FieldError message={state.fieldErrors.newPassword} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="label">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
        <FieldError message={state.fieldErrors.confirmPassword} />
      </div>

      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}
