"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { LeaveError, createLeaveRequest } from "@/lib/leave-service";
import { parseDateInput } from "@/lib/leave-calc";
import { PartOfDay } from "@/generated/prisma/enums";
import { fieldErrorsFrom, leaveRequestSchema, type ActionState } from "@/lib/validation";

export async function createLeaveRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = leaveRequestSchema.safeParse({
    leaveTypeId: String(formData.get("leaveTypeId") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    isHalfDay: formData.get("isHalfDay") === "on",
    // Absent for a full day, which strict validation now enforces.
    partOfDay: formData.get("partOfDay") ? String(formData.get("partOfDay")) : undefined,
    reason: String(formData.get("reason") ?? "").trim(),
  });

  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { leaveTypeId, startDate, endDate, isHalfDay, partOfDay, reason } = parsed.data;

  try {
    await createLeaveRequest(
      {
        userId: user.id,
        leaveTypeId,
        startDate: parseDateInput(startDate),
        endDate: parseDateInput(endDate),
        isHalfDay,
        partOfDay: isHalfDay ? (partOfDay as PartOfDay) : null,
        reason,
      },
      user.name,
    );
  } catch (error) {
    const message =
      error instanceof LeaveError
        ? error.message
        : "We could not create that request. Check the dates and try again.";
    return { error: message, fieldErrors: {} };
  }

  redirect("/requests");
}
