"use client";

import { useActionState, useState } from "react";
import { createEmployeeAction, updateEmployeeAction } from "./actions";
import { initialActionState } from "@/lib/validation";
import { SubmitButton } from "@/components/submit-button";
import { ErrorBanner, FieldError } from "@/components/ui";

const inputClass = "field";

export function CreateEmployeeForm() {
  const [state, formAction] = useActionState(createEmployeeAction, initialActionState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Add employee
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full space-y-4">
      <ErrorBanner message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input id="name" name="name" required className={inputClass} />
          <FieldError message={state.fieldErrors.name} />
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
          <FieldError message={state.fieldErrors.email} />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Initial password
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={8}
            className={inputClass}
            placeholder="At least 8 characters"
          />
          <FieldError message={state.fieldErrors.password} />
        </div>

        <div>
          <label htmlFor="role" className="label">
            Role
          </label>
          <select id="role" name="role" defaultValue="EMPLOYEE" className={inputClass}>
            <option value="EMPLOYEE">Employee</option>
            <option value="HR">HR administrator</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <SubmitButton pendingLabel="Creating...">Create account</SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function EmployeeRowForm({
  user,
  isSelf,
}: {
  user: { id: string; name: string; email: string; role: "EMPLOYEE" | "HR"; active: boolean };
  isSelf: boolean;
}) {
  const [state, formAction] = useActionState(updateEmployeeAction, initialActionState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="userId" value={user.id} />
      <ErrorBanner message={state.error} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className="block text-xs font-medium text-slate-500">Name</label>
          <input name="name" defaultValue={user.name} required className={inputClass} />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Role</label>
          <select
            name="role"
            defaultValue={user.role}
            disabled={isSelf}
            className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="HR">HR</option>
          </select>
        </div>

        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={user.active}
            disabled={isSelf}
            className="h-4 w-4 rounded border-slate-300"
          />
          Active
        </label>

        <div className="pb-1">
          <SubmitButton variant="secondary" pendingLabel="...">
            Save
          </SubmitButton>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {user.email}
        {isSelf && " (this is you)"}
      </p>
    </form>
  );
}
