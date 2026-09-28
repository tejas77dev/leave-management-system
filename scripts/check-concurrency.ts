/**
 * Regression check for concurrent leave submission.
 *
 * Fires several simultaneous requests that each need the same last available
 * day, and asserts the database only ever grants it once. Before the
 * compare-and-swap fix this let every writer believe it had the balance, so all
 * of them succeeded and the balance was over-allocated.
 *
 * Run with: npm run test:concurrency
 */
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { createLeaveRequest, LeaveError } from "../src/lib/leave-service";

const DB_URL = "file:./prisma/concurrency.db";
const dbFile = path.resolve(process.cwd(), "prisma", "concurrency.db");
// Requests are placed in a far-future year so the balance row under test is
// unambiguously the one this check created.
const YEAR = 2030;
const ATTEMPTS = 6;

if (existsSync(dbFile)) rmSync(dbFile, { force: true });
execSync("npx prisma migrate deploy", { stdio: "ignore", env: { ...process.env, DATABASE_URL: DB_URL } });

process.env.DATABASE_URL = DB_URL;
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: DB_URL }) });

function fail(message: string): never {
  console.error(`\n  FAIL  ${message}`);
  process.exit(1);
}

async function main() {
  const user = await db.user.create({
    data: {
      email: "race@test.local",
      name: "Race Condition",
      passwordHash: await bcrypt.hash("password123", 10),
    },
  });

  const leaveType = await db.leaveType.create({
    data: { name: "Race Leave", defaultDays: 1 },
  });

  // Exactly one day available, so only one of the parallel requests may win.
  await db.leaveBalance.create({
    data: { userId: user.id, leaveTypeId: leaveType.id, year: YEAR, entitled: 1 },
  });

  // Separate, non-overlapping weekdays: only the balance can decide the winner.
  const dates = [
    "2030-01-07",
    "2030-01-08",
    "2030-01-09",
    "2030-01-10",
    "2030-01-11",
    "2030-01-14",
  ].slice(0, ATTEMPTS);

  const results = await Promise.allSettled(
    dates.map((day) =>
      createLeaveRequest(
        {
          userId: user.id,
          leaveTypeId: leaveType.id,
          startDate: new Date(`${day}T00:00:00.000Z`),
          endDate: new Date(`${day}T00:00:00.000Z`),
          isHalfDay: false,
          partOfDay: null,
          reason: "concurrency probe",
        },
        user.name,
      ),
    ),
  );

  const granted = results.filter((r) => r.status === "fulfilled");
  const refused = results.filter((r) => r.status === "rejected");

  const balance = await db.leaveBalance.findFirstOrThrow({
    where: { userId: user.id, leaveTypeId: leaveType.id, year: YEAR },
  });

  const stored = await db.leaveRequest.count({ where: { userId: user.id } });

  console.log(`\n  ${ATTEMPTS} simultaneous requests for 1 available day`);
  console.log(`  granted: ${granted.length}   refused: ${refused.length}`);
  console.log(`  stored requests: ${stored}   balance pending: ${balance.pending}`);

  if (granted.length !== 1) {
    fail(`expected exactly 1 request to be granted, got ${granted.length}`);
  }
  if (stored !== 1) {
    fail(`expected exactly 1 stored request, got ${stored}`);
  }
  if (balance.pending !== 1) {
    fail(`expected pending to be 1, got ${balance.pending} (balance was over-allocated)`);
  }
  if (refused.length !== ATTEMPTS - 1) {
    fail(`expected ${ATTEMPTS - 1} refusals, got ${refused.length}`);
  }

  const reasons: unknown[] = refused.map((r) => (r as PromiseRejectedResult).reason);
  const unexpected = reasons.filter((reason) => !(reason instanceof LeaveError));
  if (unexpected.length > 0) {
    fail(`a refusal was not a LeaveError: ${String(unexpected[0])}`);
  }

  console.log("\n  PASS  the balance was consumed exactly once\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    if (existsSync(dbFile)) rmSync(dbFile, { force: true });
  });
