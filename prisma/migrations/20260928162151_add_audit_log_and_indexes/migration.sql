-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "LeaveBalance_userId_year_idx" ON "LeaveBalance"("userId", "year");

-- CreateIndex
CREATE INDEX "LeaveBalance_leaveTypeId_year_idx" ON "LeaveBalance"("leaveTypeId", "year");

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_startDate_idx" ON "LeaveRequest"("userId", "startDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_startDate_idx" ON "LeaveRequest"("status", "startDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_leaveTypeId_status_idx" ON "LeaveRequest"("leaveTypeId", "status");

-- CreateIndex
CREATE INDEX "LeaveType_active_idx" ON "LeaveType"("active");
