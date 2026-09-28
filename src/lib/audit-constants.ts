import type { AuditAction } from "@/generated/prisma/enums";

/**
 * Kept free of any database import: this module is loaded by client components
 * via the shared UI kit, and pulling `db` in there would ship Prisma to the
 * browser.
 */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  REQUEST_SUBMITTED: "Request submitted",
  REQUEST_APPROVED: "Request approved",
  REQUEST_REJECTED: "Request rejected",
  EMPLOYEE_CREATED: "Employee added",
  EMPLOYEE_UPDATED: "Employee updated",
  LEAVE_TYPE_CREATED: "Leave type created",
  LEAVE_TYPE_UPDATED: "Leave type updated",
  ENTITLEMENT_UPDATED: "Allowance changed",
  PASSWORD_CHANGED: "Password changed",
};
