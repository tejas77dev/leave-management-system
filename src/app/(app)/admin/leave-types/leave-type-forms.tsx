"use client";

import { useActionState } from "react";
import { saveLeaveTypeAction } from "./actions";
import { initialActionState } from "@/lib/validation";
import { SubmitButton } from "@/components/submit-button";
import { ErrorBanner, FieldError } from "@/components/ui";

const inputClass = "field";

type LeaveType = {
  id: string;
  name: string;
  description: string | null;
  defaultDays: number;
  active: boolean;
};

function LeaveTypeFields({ leaveType }: { leaveType?: LeaveType }) {
  const [state, formAction] = useActionState(saveLeaveTypeAction, initialActionState);

  return (
    <form action={formAction} className="space-y-3">
      {leaveType && <input type="hidden" name="id" value={leaveType.id} />}
      <ErrorBanner message={state.error} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className="block text-xs font-medium text-slate-500">Name</label>
          <input
            name="name"
            defaultValue={leaveType?.name}
            required
            className={inputClass}
          />
          <FieldError message={state.fieldErrors.name} />
        </div>

        <div className="min-w-56 flex-1">
          <label className="block text-xs font-medium text-slate-500">Description</label>
          <input
            name="description"
            defaultValue={leaveType?.description ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Default days</label>
          <input
            name="defaultDays"
            type="number"
            step="0.5"
            min="0"
            defaultValue={leaveType?.defaultDays ?? 15}
            required
            className={inputClass}
          />
          <FieldError message={state.fieldErrors.defaultDays} />
        </div>

        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={leaveType ? leaveType.active : true}
            className="h-4 w-4 rounded border-slate-300"
          />
          Active
        </label>

        <div className="pb-1">
          <SubmitButton variant={leaveType ? "secondary" : "primary"} pendingLabel="...">
            {leaveType ? "Save" : "Add leave type"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

export function CreateLeaveTypeForm() {
  return <LeaveTypeFields />;
}

export function EditLeaveTypeForm({ leaveType }: { leaveType: LeaveType }) {
  return <LeaveTypeFields leaveType={leaveType} />;
}
