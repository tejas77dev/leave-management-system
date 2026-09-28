import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import {
  calculateLeaveDays,
  currentYear,
  remainingDays,
  roundDays,
  toDateInput,
} from "@/lib/leave-calc";
import { AuditAction, PartOfDay, RequestStatus } from "@/generated/prisma/enums";

export class LeaveError extends Error {}

/** The top-level client or an interactive-transaction client. */
type Db = Pick<
  typeof db,
  "leaveRequest" | "leaveBalance" | "leaveType" | "user" | "auditLog" | "$executeRaw"
>;

export type CreateRequestInput = {
  userId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
  partOfDay: PartOfDay | null;
  reason?: string;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

/** Balance rows are per calendar year; new years start from the type default. */
export async function ensureBalance(
  userId: string,
  leaveTypeId: string,
  year: number,
  client: Db = db,
) {
  const existing = await client.leaveBalance.findUnique({
    where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
  });
  if (existing) return existing;

  const leaveType = await client.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveType) throw new LeaveError("That leave type no longer exists.");

  try {
    return await client.leaveBalance.create({
      data: { userId, leaveTypeId, year, entitled: leaveType.defaultDays, used: 0, pending: 0 },
    });
  } catch (error) {
    // A concurrent submission created the row first; use theirs.
    if (!isUniqueViolation(error)) throw error;
    const raced = await client.leaveBalance.findUnique({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    });
    if (!raced) throw error;
    return raced;
  }
}

async function findOverlappingRequest(
  client: Db,
  userId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string,
) {
  return client.leaveRequest.findFirst({
    where: {
      userId,
      id: excludeId ? { not: excludeId } : undefined,
      status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    include: { leaveType: true },
  });
}

/**
 * Takes SQLite's write lock immediately, so a second concurrent submission
 * blocks here rather than reading a balance that is about to change.
 */
async function acquireWriteLock(client: Db, balanceId: string) {
  await client.$executeRaw`UPDATE "LeaveBalance" SET "pending" = "pending" WHERE "id" = ${balanceId}`;
}

export async function createLeaveRequest(input: CreateRequestInput, actorName: string) {
  const leaveType = await db.leaveType.findUnique({ where: { id: input.leaveTypeId } });
  if (!leaveType || !leaveType.active) {
    throw new LeaveError("That leave type is not available.");
  }

  let days: number;
  try {
    days = calculateLeaveDays({
      startDate: input.startDate,
      endDate: input.endDate,
      isHalfDay: input.isHalfDay,
    });
  } catch (error) {
    throw new LeaveError(error instanceof Error ? error.message : "Invalid dates.");
  }

  if (days <= 0) {
    throw new LeaveError("That range contains no working days.");
  }

  // A request is charged against the year it starts in.
  const year = input.startDate.getUTCFullYear();
  const balance = await ensureBalance(input.userId, input.leaveTypeId, year);

  return db.$transaction(
    async (tx) => {
      // Everything below is the critical section: no read of `pending` may
      // happen before the write lock is held.
      await acquireWriteLock(tx, balance.id);

      const overlap = await findOverlappingRequest(
        tx,
        input.userId,
        input.startDate,
        input.endDate,
      );
      if (overlap) {
        throw new LeaveError(
          `These dates overlap your existing ${overlap.leaveType.name} request ` +
            `(${toDateInput(overlap.startDate)} to ${toDateInput(overlap.endDate)}).`,
        );
      }

      // Compare-and-swap: the balance is re-checked by the database itself, so
      // two simultaneous submissions can never both consume the same last day.
      const updated = await tx.$executeRaw`
        UPDATE "LeaveBalance"
        SET "pending" = ROUND("pending" + ${days}, 2)
        WHERE "id" = ${balance.id}
          AND ("entitled" - "used" - "pending") >= ${days}
      `;

      if (updated === 0) {
        const current = await tx.leaveBalance.findUnique({ where: { id: balance.id } });
        const available = remainingDays(
          current ?? { entitled: 0, used: 0, pending: 0 },
        );
        throw new LeaveError(
          `Not enough ${leaveType.name} balance. You need ${days} day(s) but only have ` +
            `${available} available.`,
        );
      }

      const request = await tx.leaveRequest.create({
        data: {
          userId: input.userId,
          leaveTypeId: input.leaveTypeId,
          startDate: input.startDate,
          endDate: input.endDate,
          days,
          isHalfDay: input.isHalfDay,
          partOfDay: input.isHalfDay ? input.partOfDay : null,
          reason: input.reason || null,
          status: RequestStatus.PENDING,
        },
      });

      await recordAudit(
        {
          actor: { id: input.userId, name: actorName },
          action: AuditAction.REQUEST_SUBMITTED,
          entityType: "LeaveRequest",
          entityId: request.id,
          summary: `Requested ${days} day(s) of ${leaveType.name} (${toDateInput(input.startDate)}${
            input.isHalfDay ? "" : ` to ${toDateInput(input.endDate)}`
          })`,
          metadata: { leaveType: leaveType.name, days, isHalfDay: input.isHalfDay },
        },
        tx,
      );

      return request;
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}

export async function reviewLeaveRequest(
  reviewer: { id: string; name: string },
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  reviewNote?: string,
) {
  return db.$transaction(
    async (tx) => {
      const request = await tx.leaveRequest.findUnique({
        where: { id: requestId },
        include: { leaveType: true, user: true },
      });

      if (!request) throw new LeaveError("That request no longer exists.");
      if (request.status !== RequestStatus.PENDING) {
        throw new LeaveError("That request has already been reviewed.");
      }
      if (request.userId === reviewer.id) {
        throw new LeaveError("You cannot review your own leave request.");
      }

      const year = request.startDate.getUTCFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId: request.userId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
      });

      if (!balance) throw new LeaveError("No balance exists for that request.");

      await acquireWriteLock(tx, balance.id);

      // Only release a reservation that is actually still there, so a
      // double-submit cannot decrement the same days twice.
      const released = await tx.$executeRaw`
        UPDATE "LeaveBalance"
        SET "pending" = ROUND("pending" - ${request.days}, 2)
        WHERE "id" = ${balance.id}
          AND "pending" >= ${request.days}
      `;

      if (released === 0) {
        throw new LeaveError(
          "That request's balance reservation is no longer available. Reject the pending request instead.",
        );
      }

      if (decision === "APPROVED") {
        const consumed = await tx.$executeRaw`
          UPDATE "LeaveBalance"
          SET "used" = ROUND("used" + ${request.days}, 2)
          WHERE "id" = ${balance.id}
            AND ("entitled" - "used" - ${request.days}) >= 0
        `;

        if (consumed === 0) {
          const current = await tx.leaveBalance.findUnique({ where: { id: balance.id } });
          const available = remainingDays(current ?? { entitled: 0, used: 0, pending: 0 });
          throw new LeaveError(
            `Cannot approve: ${request.user.name} has only ${available} day(s) left, ` +
              `but this request is ${request.days}.`,
          );
        }
      }

      const updated = await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: decision,
          reviewedById: reviewer.id,
          reviewNote: reviewNote || null,
          reviewedAt: new Date(),
        },
      });

      await recordAudit(
        {
          actor: reviewer,
          action:
            decision === "APPROVED" ? AuditAction.REQUEST_APPROVED : AuditAction.REQUEST_REJECTED,
          entityType: "LeaveRequest",
          entityId: request.id,
          summary: `${decision === "APPROVED" ? "Approved" : "Rejected"} ${request.user.name}'s ` +
            `${request.days} day(s) of ${request.leaveType.name}`,
          metadata: {
            employee: request.user.name,
            leaveType: request.leaveType.name,
            days: request.days,
            note: reviewNote || null,
          },
        },
        tx,
      );

      return updated;
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}

export async function getMyBalances(userId: string, year: number) {
  const leaveTypes = await db.leaveType.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    leaveTypes.map(async (leaveType) => {
      const balance = await db.leaveBalance.findUnique({
        where: { userId_leaveTypeId_year: { userId, leaveTypeId: leaveType.id, year } },
      });
      return {
        leaveType,
        entitled: balance?.entitled ?? 0,
        used: balance?.used ?? 0,
        pending: balance?.pending ?? 0,
        remaining: remainingDays(balance ?? { entitled: 0, used: 0, pending: 0 }),
      };
    }),
  );
}

export { currentYear, roundDays };
