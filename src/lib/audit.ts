import { db } from "@/lib/db";
import { AuditAction } from "@/generated/prisma/enums";

/**
 * Either the top-level client or an interactive-transaction client, so audit
 * entries can be written inside the same transaction as the change they describe.
 */
type AuditClient = Pick<typeof db, "auditLog">;

export type AuditEntry = {
  actor: { id: string; name: string } | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function recordAudit(entry: AuditEntry, client: AuditClient = db) {
  return client.auditLog.create({
    data: {
      actorId: entry.actor?.id ?? null,
      // Denormalised so the trail still reads correctly if the user is removed.
      actorName: entry.actor?.name ?? "System",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    },
  });
}
