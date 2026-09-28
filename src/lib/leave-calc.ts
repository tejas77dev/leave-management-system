export const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a `YYYY-MM-DD` date input into a Date pinned to UTC midnight. */
export function parseDateInput(value: string): Date {
  if (!DATE_INPUT_PATTERN.test(value)) {
    throw new Error(`Invalid date format: ${value}`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  return date;
}

/** Formats a Date as a `YYYY-MM-DD` string using its UTC parts. */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Counts Monday-Friday days in the inclusive range. */
export function countWeekdays(startDate: Date, endDate: Date): number {
  if (endDate.getTime() < startDate.getTime()) {
    throw new Error("End date must not be before start date");
  }

  let count = 0;
  for (let cursor = startDate; cursor.getTime() <= endDate.getTime(); cursor = addDays(cursor, 1)) {
    if (!isWeekend(cursor)) count += 1;
  }

  return count;
}

export type LeaveDayInput = {
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
};

/**
 * Leave consumed by a request. Half-days are always 0.5 and are limited to a
 * single date; everything else counts weekdays, so weekends are free.
 */
export function calculateLeaveDays({ startDate, endDate, isHalfDay }: LeaveDayInput): number {
  if (endDate.getTime() < startDate.getTime()) {
    throw new Error("End date must not be before start date");
  }

  if (isHalfDay) {
    if (toDateInput(startDate) !== toDateInput(endDate)) {
      throw new Error("A half-day request must cover a single date");
    }
    return 0.5;
  }

  return countWeekdays(startDate, endDate);
}

export type BalanceLike = {
  entitled: number;
  used: number;
  pending: number;
};

/** Days still available, i.e. entitlement not yet consumed or reserved. */
export function remainingDays(balance: BalanceLike): number {
  return roundDays(balance.entitled - balance.used - balance.pending);
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}

/** Avoids float drift like 0.30000000000000004 from repeated 0.5 additions. */
export function roundDays(value: number): number {
  return Math.round(value * 100) / 100;
}

export function currentYear(): number {
  return new Date().getUTCFullYear();
}

/** Start of the given calendar year in UTC. */
export function startOfYear(year: number): Date {
  return new Date(Date.UTC(year, 0, 1));
}

/** End of the given calendar year in UTC. */
export function endOfYear(year: number): Date {
  return new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
}
