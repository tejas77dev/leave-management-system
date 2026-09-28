# Leave Management System

Internal leave request and approval tool. Employees request time off, HR reviews
and approves it, and balances stay correct even when requests arrive at the same
instant.

## Features

- **Leave requests** — date range, reason, and optional half-day (morning or
  afternoon). Weekends are excluded automatically, so a Mon–Fri request costs
  5 days.
- **HR approvals** — approve or reject with a note. HR cannot approve their own
  requests, and overlapping requests are rejected.
- **Balances** — per employee, per leave type, per year, tracked as
  `entitled`, `used`, and `pending`. Pending days are held in reserve the moment
  a request is submitted, so they are not double-spent.
- **Concurrency safety** — balance updates use an atomic compare-and-swap inside
  a transaction, so simultaneous requests cannot overdraw a balance. See
  [Concurrency](#why-concurrent-submissions-are-safe).
- **Audit trail** — every request, approval, employee change, leave-type change,
  entitlement change, and password change is recorded with the actor, timestamp,
  and a summary. HR can read it under **Activity**.
- **Roles** — `EMPLOYEE` and `HR`, enforced in the server actions, not just hidden
  in the UI.
- **Search and filters** — HR can filter approvals by status, leave type, and
  employee name or email. Filters live in the URL, so a filtered view is
  shareable and survives a reload.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Actions) |
| Language | TypeScript 5 |
| Database | SQLite via Prisma 7 and `better-sqlite3` |
| Validation | Zod 4 |
| Auth | Hand-rolled session cookie + bcryptjs |
| Styling | Tailwind CSS 4 |
| Tests | Vitest (unit), Playwright (E2E) |

## Requirements

- Node.js 20.9 or newer (developed on 24.x)
- npm 10 or newer

## Setup

```bash
git clone https://github.com/tejas77dev/leave-management-system.git
cd leave-management-system
npm install

# The app reads DATABASE_URL from .env. Create it from the example:
cp .env.example .env        # Windows: copy .env.example .env

npx prisma migrate deploy  # create prisma/dev.db and apply migrations
npm run db:seed             # demo users, leave types, and balances

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Use `localhost`, not `127.0.0.1`. Next's dev server has an HMR issue over
> `127.0.0.1` that leaves pages hydrated but unresponsive.

`npm install` runs `prisma generate` automatically via `postinstall`.

### Demo accounts

All seeded accounts use the password `password123`.

| Email | Role | Sees |
|---|---|---|
| `hr@company.com` | HR | Approvals, employees, balances, leave types, activity |
| `sam@company.com` | Employee | Dashboard, own requests, password change |
| `aisha@company.com` | Employee | Dashboard, own requests, password change |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E (builds and starts the app on port 3100) |
| `npm run test:concurrency` | Concurrency regression check |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Reseed demo data |
| `npm run db:reset` | Drop, re-migrate, and reseed |

## Tests

```bash
npm run typecheck && npm run lint
npm test
npm run test:concurrency
npx playwright install chromium   # once, before the first E2E run
npm run test:e2e
```

The E2E suite builds the app and runs it against an isolated `prisma/test.db`, so
it never touches development data. Note that it shares one database across its
scenarios, so each test uses its own week to avoid tripping overlap validation.

## Why concurrent submissions are safe

The original implementation read a balance, decided it was sufficient, and then
wrote back a new value. Two requests that arrived together could both read the
same available figure and both succeed, overdrawing the balance.

The fix reserves days with a conditional update, so the check and the write are
one atomic step:

```sql
UPDATE "LeaveBalance"
SET "pending" = ROUND("pending" + <days>, 2)
WHERE "id" = <id>
  AND ("entitled" - "used" - "pending") >= <days>
```

If the row is updated (`pending` increased), the request is created in the same
transaction. If the update affects zero rows, another writer got there first and
the request is refused with a message showing what is actually left.

`npm run test:concurrency` proves this by firing six simultaneous requests at a
balance with a single day available, against a throwaway database. Exactly one
may win:

```
6 simultaneous requests for 1 available day
granted: 1   refused: 5
stored requests: 1   balance pending: 1
PASS  the balance was consumed exactly once
```

Reverting the conditional `WHERE` clause makes all six succeed and sets
`pending` to 6, which is the bug this check exists to prevent.

## Project layout

```
prisma/
  schema.prisma        users, leave types, balances, requests, audit log
  migrations/          checked in; `deploy` on a fresh clone
  seed.ts              demo data
src/
  lib/
    db.ts              Prisma client (server-only)
    auth.ts            session cookie helpers and role guards
    leave-calc.ts      working-day and half-day arithmetic
    leave-service.ts   request/review transactions and balance updates
    validation.ts      Zod schemas
    audit.ts           audit writer
    audit-constants.ts audit labels, safe to import from client components
  app/
    login/             sign in
    (app)/             authenticated shell
      dashboard/       balances and recent requests
      requests/        own requests, new request form
      admin/           approvals, employees, balances, leave types, activity
    account/password/  change own password
e2e/                   Playwright specs
scripts/               database preparation and concurrency check
```

## Security notes

- Passwords are hashed with bcryptjs and never returned by queries.
- Sessions are HttpOnly, SameSite=Lax, 7-day cookies.
- Every mutation re-validates the session and the role on the server; the
  `requireHR()` guard runs before any admin query.
- The audit log stores a denormalised `actorName`, so history stays readable
  even if the user is later deleted.

## Known limitations

- **SQLite is a single-writer database.** Fine for a small internal team, but it
  is not suited to serverless deployment. On Vercel the filesystem is ephemeral,
  so data would not persist between invocations. Move to Postgres by changing the
  Prisma provider and the adapter before deploying.
- Balance mutations are serialised through a no-op write to acquire SQLite's
  write lock. Under heavy contention some requests will fail fast rather than
  queue; a busy-retry loop would be the next step.
- The audit log is append-only by convention, not enforced by the database.
  Anyone with write access to the SQLite file can still alter rows.
- Login and logout events are not audited; only changes to data are.
