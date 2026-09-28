"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { initialActionState } from "@/lib/validation";
import { SubmitButton } from "@/components/submit-button";
import { ErrorBanner, FieldError } from "@/components/ui";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state.error} />

      <div>
        <label htmlFor="email" className="label">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="you@company.com"
          className="field"
        />
        <FieldError message={state.fieldErrors.email} />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
        <FieldError message={state.fieldErrors.password} />
      </div>

      <SubmitButton pendingLabel="Signing in..." className="mt-2 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
