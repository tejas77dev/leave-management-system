"use server";

import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import { fieldErrorsFrom, changePasswordSchema, type ActionState } from "@/lib/validation";

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record) {
    return { error: "Your account could not be found.", fieldErrors: {} };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, record.passwordHash);
  if (!valid) {
    return { error: null, fieldErrors: { currentPassword: "That is not your current password" } };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  await recordAudit({
    actor: { id: user.id, name: user.name },
    action: AuditAction.PASSWORD_CHANGED,
    entityType: "User",
    entityId: user.id,
    summary: `${user.name} changed their password`,
  });

  return { error: null, fieldErrors: {}, success: true };
}
