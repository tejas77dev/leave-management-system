import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "password123";

const LEAVE_TYPES = [
  { name: "Casual Leave", description: "Short personal absences", defaultDays: 15 },
  { name: "Sick Leave", description: "Illness and medical appointments", defaultDays: 12 },
  { name: "Earned Leave", description: "Planned vacation and earned time off", defaultDays: 20 },
];

const USERS = [
  { email: "hr@company.com", name: "Priya Nair", role: "HR" as const },
  { email: "sam@company.com", name: "Sam Patel", role: "EMPLOYEE" as const },
  { email: "aisha@company.com", name: "Aisha Khan", role: "EMPLOYEE" as const },
];

async function main() {
  const year = new Date().getUTCFullYear();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const user of USERS) {
    await db.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role },
      create: { ...user, passwordHash },
    });
  }

  const users = await db.user.findMany({ where: { email: { in: USERS.map((u) => u.email) } } });

  for (const type of LEAVE_TYPES) {
    const leaveType = await db.leaveType.upsert({
      where: { name: type.name },
      update: { description: type.description, defaultDays: type.defaultDays },
      create: type,
    });

    for (const user of users) {
      await db.leaveBalance.upsert({
        where: {
          userId_leaveTypeId_year: { userId: user.id, leaveTypeId: leaveType.id, year },
        },
        update: {},
        create: { userId: user.id, leaveTypeId: leaveType.id, year, entitled: type.defaultDays },
      });
    }
  }

  console.log(`Seeded ${LEAVE_TYPES.length} leave types and ${users.length} users for ${year}.`);
  console.log(`\nSign in with any of these (password: ${DEMO_PASSWORD}):`);
  for (const user of USERS) console.log(`  ${user.role.padEnd(8)} ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
