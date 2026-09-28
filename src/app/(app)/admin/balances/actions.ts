"use server";

import { revalidatePath } from "next/cache";
import { requireHR } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import { formatDays } from "@/components/ui";
import { fieldErrorsFrom, setEntitlementSchema, type ActionState } from "@/lib/validation";

export async function setEntitlementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const hr = await requireHR();

  const parsed = setEntitlementSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    leaveTypeId: String(formData.get("leaveTypeId") ?? ""),
    year: String(formData.get("year") ?? ""),
    entitled: String(formData.get("entitled") ?? ""),
  });

  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { userId, leaveTypeId, year, entitled } = parsed.data;

  const balance = await db.leaveBalance.findUnique({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
  });

  if (!balance) {
    return { error: "That balance row does not exist.", fieldErrors: {} };
  }

  // Entitlement below what is already consumed would make the numbers nonsense.
  const committed = balance.used + balance.pending;
  if (entitled < committed) {
    return {
      error: `This employee already has ${committed} day(s) used or pending. Set the allowance to at least that.`,
      fieldErrors: {},
    };
  }

  await db.leaveBalance.update({ where: { id: balance.id }, data: { entitled } });

  const subject = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  const leaveType = await db.leaveType.findUnique({
    where: { id: leaveTypeId },
    select: { name: true },
  });

  await recordAudit({
    actor: { id: hr.id, name: hr.name },
    action: AuditAction.ENTITLEMENT_UPDATED,
    entityType: "LeaveBalance",
    entityId: balance.id,
    summary: `${subject?.name ?? "An employee"}'s ${leaveType?.name ?? "leave"} allowance ` +
      `for ${year} changed from ${formatDays(balance.entitled)} to ${formatDays(entitled)} day(s)`,
    metadata: {
      userId,
      leaveTypeId,
      year,
      from: balance.entitled,
      to: entitled,
    },
  });

  revalidatePath("/admin/balances");
  revalidatePath("/admin/audit");
  revalidatePath("/dashboard");
  return { error: null, fieldErrors: {} };
}
