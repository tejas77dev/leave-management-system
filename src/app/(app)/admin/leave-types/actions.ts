"use server";

import { revalidatePath } from "next/cache";
import { requireHR } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentYear } from "@/lib/leave-calc";
import { recordAudit } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import { fieldErrorsFrom, leaveTypeSchema, type ActionState } from "@/lib/validation";

export async function saveLeaveTypeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const hr = await requireHR();

  const parsed = leaveTypeSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    defaultDays: String(formData.get("defaultDays") ?? ""),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const id = String(formData.get("id") ?? "");
  const year = currentYear();

  if (id) {
    const existing = await db.leaveType.findUnique({ where: { id } });
    if (!existing) {
      return { error: "That leave type no longer exists.", fieldErrors: {} };
    }

    await db.leaveType.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        defaultDays: parsed.data.defaultDays,
        active: parsed.data.active,
      },
    });

    const changes: string[] = [];
    if (existing.name !== parsed.data.name) changes.push(`renamed to "${parsed.data.name}"`);
    if (existing.defaultDays !== parsed.data.defaultDays) {
      changes.push(`default ${existing.defaultDays} -> ${parsed.data.defaultDays} day(s)`);
    }
    if (existing.active !== parsed.data.active) {
      changes.push(existing.active ? "reactivated" : "deactivated");
    }

    if (changes.length > 0) {
      await recordAudit({
        actor: { id: hr.id, name: hr.name },
        action: AuditAction.LEAVE_TYPE_UPDATED,
        entityType: "LeaveType",
        entityId: id,
        summary: `Updated ${existing.name}`,
        metadata: { changes },
      });
    }

    // Keep untouched balances in step with a changed default for future years.
    if (parsed.data.defaultDays !== existing.defaultDays) {
      await db.leaveBalance.updateMany({
        where: { leaveTypeId: id, year, entitled: existing.defaultDays, used: 0, pending: 0 },
        data: { entitled: parsed.data.defaultDays },
      });
    }
  } else {
    const duplicate = await db.leaveType.findUnique({ where: { name: parsed.data.name } });
    if (duplicate) {
      return { error: null, fieldErrors: { name: "A leave type with that name exists" } };
    }

    const leaveType = await db.leaveType.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        defaultDays: parsed.data.defaultDays,
        active: parsed.data.active,
      },
    });

    const users = await db.user.findMany({ where: { active: true } });
    for (const user of users) {
      await db.leaveBalance.upsert({
        where: {
          userId_leaveTypeId_year: { userId: user.id, leaveTypeId: leaveType.id, year },
        },
        update: {},
        create: {
          userId: user.id,
          leaveTypeId: leaveType.id,
          year,
          entitled: parsed.data.defaultDays,
        },
      });
    }

    await recordAudit({
      actor: { id: hr.id, name: hr.name },
      action: AuditAction.LEAVE_TYPE_CREATED,
      entityType: "LeaveType",
      entityId: leaveType.id,
      summary: `Created ${leaveType.name} with a default of ${parsed.data.defaultDays} day(s)`,
      metadata: { defaultDays: parsed.data.defaultDays, balancesCreated: users.length },
    });
  }

  revalidatePath("/admin/leave-types");
  revalidatePath("/admin/balances");
  revalidatePath("/admin/audit");
  revalidatePath("/dashboard");
  return { error: null, fieldErrors: {} };
}
