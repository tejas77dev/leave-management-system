import { existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const TEST_URL = "file:./prisma/test.db";
const dbFile = path.resolve(process.cwd(), "prisma", "test.db");

if (existsSync(dbFile)) {
  rmSync(dbFile, { force: true });
  console.log("Removed existing test database.");
}

const env = { ...process.env, DATABASE_URL: TEST_URL };

execSync("npx prisma migrate deploy", { stdio: "inherit", env });
execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });

console.log("Test database ready at prisma/test.db");
