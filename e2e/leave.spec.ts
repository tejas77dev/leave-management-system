import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "password123";

/**
 * Monday-to-Friday window far enough ahead to be stable year-round.
 * Each test needs its own week, because overlapping requests are rejected.
 */
function nextWeekWindow(weeksAhead = 0): { start: string; end: string } {
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() + 14 + weeksAhead * 7);

  // Move to the next Monday.
  while (cursor.getUTCDay() !== 1) cursor.setUTCDate(cursor.getUTCDate() + 1);

  const end = new Date(cursor);
  end.setUTCDate(end.getUTCDate() + 4); // Friday

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(cursor), end: fmt(end) };
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click('button:has-text("Sign in")');
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Picks a leave type by its visible name, since the label includes the balance. */
async function selectLeaveType(page: Page, name: string) {
  const select = page.locator("#leaveTypeId");
  const options = await select.locator("option").allTextContents();
  const index = options.findIndex((text) => text.includes(name));
  expect(index, `leave type "${name}" not found in ${JSON.stringify(options)}`).toBeGreaterThan(0);
  await select.selectOption({ index });
}

function balanceTile(page: Page, name: string) {
  return page.locator(`[data-testid="balance-tile"][data-leave-type="${name}"]`);
}

test("employee requests leave, HR approves it, balance drops", async ({ browser }) => {
  const window = nextWeekWindow();

  const employeeContext = await browser.newContext();
  const employee = await employeeContext.newPage();

  await login(employee, "sam@company.com");

  await employee.goto("/dashboard");
  await expect(balanceTile(employee, "Casual Leave")).toContainText("15left");

  // Submit a Monday-to-Friday request (5 working days).
  await employee.goto("/requests/new");
  await selectLeaveType(employee, "Casual Leave");
  await employee.fill("#startDate", window.start);
  await employee.fill("#endDate", window.end);
  await expect(employee.getByRole("status")).toContainText("5 day(s)");
  await employee.click('button:has-text("Submit request")');

  await expect(employee).toHaveURL(/\/requests$/);
  const row = employee.locator("tbody tr").first();
  await expect(row).toContainText("Casual Leave");
  await expect(row).toContainText("Pending");

  // Pending days are already held in reserve, so they are not "left".
  await employee.goto("/dashboard");
  await expect(balanceTile(employee, "Casual Leave")).toContainText("10left");
  await expect(balanceTile(employee, "Casual Leave")).toContainText("Pending 5");

  // HR approves it.
  const hrContext = await browser.newContext();
  const hr = await hrContext.newPage();
  await login(hr, "hr@company.com");

  await hr.goto("/admin/requests");
  const card = hr.locator("li", { hasText: "Sam Patel" }).first();
  await expect(card).toContainText("Casual Leave");

  await card.locator('input[name="reviewNote"]').fill("Approved, enjoy.");
  await card.locator('button:has-text("Approve")').click();

  await expect(hr.locator("li", { hasText: "Sam Patel" })).toHaveCount(0);
  await expect(hr.locator("tr", { hasText: "Sam Patel" }).first()).toContainText("Approved");

  // Now the days show as used rather than pending.
  await employee.goto("/dashboard");
  await expect(balanceTile(employee, "Casual Leave")).toContainText("10left");
  await expect(balanceTile(employee, "Casual Leave")).toContainText("Used 5");
  await expect(balanceTile(employee, "Casual Leave")).toContainText("Pending 0");

  await employeeContext.close();
  await hrContext.close();
});

test("overlapping requests are rejected with a clear message", async ({ browser }) => {
  const window = nextWeekWindow(1);

  const context = await browser.newContext();
  const employee = await context.newPage();
  await login(employee, "aisha@company.com");

  await employee.goto("/requests/new");
  await selectLeaveType(employee, "Sick Leave");
  await employee.fill("#startDate", window.start);
  await employee.fill("#endDate", window.end);
  await employee.click('button:has-text("Submit request")');
  await expect(employee).toHaveURL(/\/requests$/);

  // A second, overlapping request must be refused.
  await employee.goto("/requests/new");
  await selectLeaveType(employee, "Sick Leave");
  await employee.fill("#startDate", window.start);
  await employee.fill("#endDate", window.end);
  await employee.click('button:has-text("Submit request")');

  await expect(employee.getByTestId("form-error")).toContainText(/overlap/i);
  await expect(employee).toHaveURL(/\/requests\/new$/);

  await context.close();
});

test("half-day requests consume 0.5 days", async ({ browser }) => {
  const window = nextWeekWindow(2);

  const context = await browser.newContext();
  const employee = await context.newPage();
  await login(employee, "sam@company.com");

  await employee.goto("/requests/new");
  await selectLeaveType(employee, "Earned Leave");
  await employee.check("#isHalfDay");
  await employee.fill("#startDate", window.start);
  await employee.selectOption("#partOfDay", "AFTERNOON");
  await expect(employee.getByRole("status")).toContainText("0.5 day(s)");
  await employee.click('button:has-text("Submit request")');

  await expect(employee).toHaveURL(/\/requests$/);
  const row = employee.locator("tbody tr").first();
  await expect(row).toContainText("0.5");
  await expect(row).toContainText("afternoon half-day");

  await context.close();
});

test("employees cannot reach the HR area", async ({ browser }) => {
  const context = await browser.newContext();
  const employee = await context.newPage();
  await login(employee, "sam@company.com");

  // requireHR() bounces a non-HR user back to their dashboard.
  await employee.goto("/admin/requests");
  await expect(employee).toHaveURL(/\/dashboard$/);

  // And the HR navigation is not rendered for them.
  await expect(employee.getByRole("navigation", { name: "Main" })).not.toContainText(
    "Approvals",
  );

  await context.close();
});

test("decisions are written to the audit trail", async ({ browser }) => {
  const window = nextWeekWindow(3);

  const employeeContext = await browser.newContext();
  const employee = await employeeContext.newPage();
  await login(employee, "sam@company.com");

  await employee.goto("/requests/new");
  await selectLeaveType(employee, "Sick Leave");
  await employee.fill("#startDate", window.start);
  await employee.fill("#endDate", window.end);
  await employee.click('button:has-text("Submit request")');
  await expect(employee).toHaveURL(/\/requests$/);

  const hrContext = await browser.newContext();
  const hr = await hrContext.newPage();
  await login(hr, "hr@company.com");

  await hr.goto("/admin/requests");
  // Earlier tests leave other requests in the queue, so match this one
  // specifically rather than counting the employee's whole list.
  const card = hr.locator("li", { hasText: "Sam Patel" }).filter({ hasText: "Sick Leave" });
  await expect(card).toHaveCount(1);
  await card.locator('input[name="reviewNote"]').fill("Approved for the audit trail check.");
  await card.locator('button:has-text("Approve")').click();
  await expect(card).toHaveCount(0);

  // Both the submission and the approval should be on record.
  await hr.goto("/admin/audit");
  const list = hr.locator("ol").first();
  await expect(list).toContainText("Request submitted");
  await expect(list).toContainText("Requested 5 day(s) of Sick Leave");
  await expect(list).toContainText("Request approved");
  await expect(list).toContainText("Approved Sam Patel's 5 day(s) of Sick Leave");

  await employeeContext.close();
  await hrContext.close();
});

test("HR can filter and search requests", async ({ browser }) => {
  const window = nextWeekWindow(4);

  const employeeContext = await browser.newContext();
  const employee = await employeeContext.newPage();
  await login(employee, "aisha@company.com");

  await employee.goto("/requests/new");
  await selectLeaveType(employee, "Earned Leave");
  await employee.fill("#startDate", window.start);
  await employee.fill("#endDate", window.end);
  await employee.click('button:has-text("Submit request")');
  await expect(employee).toHaveURL(/\/requests$/);
  await employeeContext.close();

  const hrContext = await browser.newContext();
  const hr = await hrContext.newPage();
  await login(hr, "hr@company.com");

  // Search by employee name.
  await hr.goto("/admin/requests");
  await hr.fill("#q", "Aisha");
  await hr.click('button:has-text("Apply")');
  await expect(hr).toHaveURL(/[?&]q=Aisha/);
  const aisha = hr.locator("li", { hasText: "Aisha Khan" });
  await expect(aisha.filter({ hasText: "Earned Leave" })).toHaveCount(1);

  // A name with no match empties the queue.
  await hr.fill("#q", "Nobody Here");
  await hr.click('button:has-text("Apply")');
  await expect(hr).toHaveURL(/[?&]q=Nobody\+Here|[?&]q=Nobody%20Here/);
  await expect(hr.getByText("No pending requests match those filters.")).toBeVisible();

  // The status filter picks which section is shown: pending-only leaves the
  // decided table empty, and a decided status leaves the queue empty.
  await hr.goto("/admin/requests?status=PENDING");
  await expect(hr.locator("#status")).toHaveValue("PENDING");
  await expect(aisha.filter({ hasText: "Earned Leave" })).toHaveCount(1);
  await expect(hr.getByText("No decisions match those filters.")).toBeVisible();

  await hr.goto("/admin/requests?status=APPROVED");
  await expect(hr.getByText("No pending requests match those filters.")).toBeVisible();
  await expect(hr.locator("tr", { hasText: "Sam Patel" }).first()).toContainText("Approved");

  await hrContext.close();
});
