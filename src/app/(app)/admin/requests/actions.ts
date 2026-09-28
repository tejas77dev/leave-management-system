"use server";

import { revalidatePath } from "next/cache";
import { requireHR } from "@/lib/auth";
import { LeaveError, reviewLeaveRequest } from "@/lib/leave-service";
import { fieldErrorsFrom, reviewRequestSchema, type ActionState } from "@/lib/validation";

export async function reviewRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reviewer = await requireHR();

  const parsed = reviewRequestSchema.safeParse({
    requestId: String(formData.get("requestId") ?? ""),
    decision: String(formData.get("decision") ?? ""),
    reviewNote: String(formData.get("reviewNote") ?? "").trim(),
  });

  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    await reviewLeaveRequest(
      { id: reviewer.id, name: reviewer.name },
      parsed.data.requestId,
      parsed.data.decision,
      parsed.data.reviewNote,
    );
  } catch (error) {
    return {
      error: error instanceof LeaveError ? error.message : "Could not record that decision.",
      fieldErrors: {},
    };
  }

  revalidatePath("/admin/requests");
  revalidatePath("/dashboard");
  return { error: null, fieldErrors: {} };
}
