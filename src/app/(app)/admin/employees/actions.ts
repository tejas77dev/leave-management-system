"use server";

import { revalidatePath } from "next/cache";
import { requireHR, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureBalance } from "@/lib/leave-service";
import { currentYear } from "@/lib/leave-calc";
import { recordAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import {
  createEmployeeSchema,
  fieldErrorsFrom,
  updateEmployeeSchema,
  type ActionState,
} from "@/lib/validation";

export async function createEmployeeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const hr = await requireHR();

  const parsed = createEmployeeSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "EMPLOYEE"),
  });

  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: null, fieldErrors: { email: "That email is already in use" } };
  }

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  // Give new joiners this year's default allowance.
  const year = currentYear();
  const leaveTypes = await db.leaveType.findMany({ where: { active: true } });
  for (const leaveType of leaveTypes) {
    await ensureBalance(user.id, leaveType.id, year);
  }

  await recordAudit({
    actor: { id: hr.id, name: hr.name },
    action: AuditAction.EMPLOYEE_CREATED,
    entityType: "User",
    entityId: user.id,
    summary: `Added ${user.name} (${user.email}) as ${user.role === "HR" ? "HR" : "an employee"}`,
    metadata: { email: user.email, role: user.role },
  });

  revalidatePath("/admin/employees");
  revalidatePath("/admin/balances");
  revalidatePath("/admin/audit");
  return { error: null, fieldErrors: {} };
}

export async function updateEmployeeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const hr = await requireHR();

  const parsed = updateEmployeeSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "EMPLOYEE"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const userId = String(formData.get("userId") ?? "");
  if (!userId) {
    return { error: "Missing employee reference.", fieldErrors: {} };
  }

  if (userId === hr.id && parsed.data.role !== "HR") {
    return { error: "You cannot remove your own HR access.", fieldErrors: {} };
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { error: "That employee no longer exists.", fieldErrors: {} };
  }

  // The last active HR account must keep access, or nobody could manage leave.
  const demotingLastHr =
    target.role === "HR" && (parsed.data.role !== "HR" || !parsed.data.active);
  if (demotingLastHr) {
    const otherActiveHrs = await db.user.count({
      where: { role: "HR", active: true, id: { not: userId } },
    });
    if (otherActiveHrs === 0) {
      return { error: "At least one active HR account is required.", fieldErrors: {} };
    }
  }

  const changes: string[] = [];
  if (target.name !== parsed.data.name) changes.push(`name "${target.name}" -> "${parsed.data.name}"`);
  if (target.role !== parsed.data.role) changes.push(`role ${target.role} -> ${parsed.data.role}`);
  if (target.active !== parsed.data.active) {
    changes.push(`active ${target.active} -> ${parsed.data.active}`);
  }

  await db.user.update({
    where: { id: userId },
    data: { name: parsed.data.name, role: parsed.data.role, active: parsed.data.active },
  });

  if (changes.length > 0) {
    await recordAudit({
      actor: { id: hr.id, name: hr.name },
      action: AuditAction.EMPLOYEE_UPDATED,
      entityType: "User",
      entityId: userId,
      summary: `Updated ${target.name}`,
      metadata: { changes },
    });
  }

  revalidatePath("/admin/employees");
  revalidatePath("/admin/audit");
  return { error: null, fieldErrors: {} };
}
