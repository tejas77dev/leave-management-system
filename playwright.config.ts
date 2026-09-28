import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Balances are shared state, so keep the run serial and deterministic.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Test the real production artifact: dev-mode HMR can keep the client from hydrating.
    command: `npm run test:e2e:prepare && npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
    env: { DATABASE_URL: "file:./prisma/test.db" },
  },
});
