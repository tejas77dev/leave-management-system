"use client";

import { useActionState, useState } from "react";
import { calculateLeaveDays, parseDateInput } from "@/lib/leave-calc";
import { createLeaveRequestAction } from "./actions";
import { initialActionState } from "@/lib/validation";
import { SubmitButton } from "@/components/submit-button";
import { ErrorBanner, FieldError, formatDays } from "@/components/ui";

type LeaveTypeOption = { id: string; name: string; remaining: number };

const inputClass = "field";

export function LeaveRequestForm({ leaveTypes }: { leaveTypes: LeaveTypeOption[] }) {
  const [state, formAction] = useActionState(createLeaveRequestAction, initialActionState);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      <ErrorBanner message={state.error} />

      <div>
        <label htmlFor="leaveTypeId" className="label">
          Leave type
        </label>
        <select
          id="leaveTypeId"
          name="leaveTypeId"
          required
          defaultValue=""
          className={inputClass}
        >
          <option value="" disabled>
            Choose a leave type
          </option>
          {leaveTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} ({formatDays(type.remaining)} left)
            </option>
          ))}
        </select>
        <FieldError message={state.fieldErrors.leaveTypeId} />
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          id="isHalfDay"
          name="isHalfDay"
          type="checkbox"
          checked={isHalfDay}
          onChange={(event) => setIsHalfDay(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="isHalfDay" className="text-sm text-slate-700">
          This is a <span className="font-medium">half-day</span> request (0.5 days)
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="label">
            {isHalfDay ? "Date" : "From"}
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={inputClass}
          />
          <FieldError message={state.fieldErrors.startDate} />
        </div>

        {isHalfDay ? (
          <>
            <input type="hidden" name="endDate" value={startDate} />
            <div>
              <label htmlFor="partOfDay" className="label">
                Which half?
              </label>
              <select id="partOfDay" name="partOfDay" defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Choose morning or afternoon
                </option>
                <option value="MORNING">Morning (first half)</option>
                <option value="AFTERNOON">Afternoon (second half)</option>
              </select>
              <FieldError message={state.fieldErrors.partOfDay} />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="endDate" className="label">
              To
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              required
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors.endDate} />
          </div>
        )}
      </div>

      <DaysPreview startDate={startDate} endDate={endDate} isHalfDay={isHalfDay} />

      <div>
        <label htmlFor="reason" className="label">
          Reason <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          maxLength={500}
          className={inputClass}
          placeholder="A short note for your approver"
        />
        <FieldError message={state.fieldErrors.reason} />
      </div>

      <SubmitButton pendingLabel="Submitting...">Submit request</SubmitButton>
    </form>
  );
}

function DaysPreview({
  startDate,
  endDate,
  isHalfDay,
}: {
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
}) {
  if (!startDate) return null;

  let text: string;
  try {
    const days = calculateLeaveDays({
      startDate: parseDateInput(startDate),
      endDate: parseDateInput(isHalfDay || !endDate ? startDate : endDate),
      isHalfDay,
    });
    text =
      days === 0
        ? "That range contains no working days."
        : `This will use ${formatDays(days)} day(s) of your balance.`;
  } catch {
    text = "Enter a valid date range.";
  }

  return (
    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600" role="status">
      {text}
    </p>
  );
}
