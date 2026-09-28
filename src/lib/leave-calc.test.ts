import { describe, expect, it } from "vitest";
import {
  calculateLeaveDays,
  countWeekdays,
  currentYear,
  isWeekend,
  parseDateInput,
  rangesOverlap,
  remainingDays,
  roundDays,
  toDateInput,
} from "@/lib/leave-calc";

const d = (value: string) => parseDateInput(value);

describe("parseDateInput", () => {
  it("parses a valid date at UTC midnight", () => {
    const date = d("2026-03-09");
    expect(date.toISOString()).toBe("2026-03-09T00:00:00.000Z");
  });

  it("rejects a malformed value", () => {
    expect(() => d("09-03-2026")).toThrow();
    expect(() => d("2026/03/09")).toThrow();
    expect(() => d("")).toThrow();
  });

  it("rejects a date that does not exist", () => {
    expect(() => d("2026-02-30")).toThrow();
    expect(() => d("2026-13-01")).toThrow();
  });

  it("accepts a real leap day and rejects a fake one", () => {
    expect(toDateInput(d("2028-02-29"))).toBe("2028-02-29");
    expect(() => d("2026-02-29")).toThrow();
  });
});

describe("isWeekend", () => {
  it("treats Saturday and Sunday as weekend", () => {
    expect(isWeekend(d("2026-03-07"))).toBe(true); // Saturday
    expect(isWeekend(d("2026-03-08"))).toBe(true); // Sunday
  });

  it("treats weekdays as working days", () => {
    expect(isWeekend(d("2026-03-09"))).toBe(false); // Monday
    expect(isWeekend(d("2026-03-13"))).toBe(false); // Friday
  });
});

describe("countWeekdays", () => {
  it("counts a single weekday as one", () => {
    expect(countWeekdays(d("2026-03-09"), d("2026-03-09"))).toBe(1);
  });

  it("counts a full Monday-to-Friday week as five", () => {
    expect(countWeekdays(d("2026-03-09"), d("2026-03-13"))).toBe(5);
  });

  it("excludes the weekend inside a range", () => {
    // Friday through the following Monday is 2 working days.
    expect(countWeekdays(d("2026-03-13"), d("2026-03-16"))).toBe(2);
  });

  it("returns zero for a weekend-only range", () => {
    expect(countWeekdays(d("2026-03-07"), d("2026-03-08"))).toBe(0);
  });

  it("spans month and year boundaries", () => {
    // 2025-12-29 Mon, 30 Tue, 31 Wed, 2026-01-01 Thu, 02 Fri => 5
    expect(countWeekdays(d("2025-12-29"), d("2026-01-02"))).toBe(5);
  });

  it("throws when the range is inverted", () => {
    expect(() => countWeekdays(d("2026-03-10"), d("2026-03-09"))).toThrow();
  });
});

describe("calculateLeaveDays", () => {
  it("charges a half-day as 0.5", () => {
    expect(
      calculateLeaveDays({
        startDate: d("2026-03-09"),
        endDate: d("2026-03-09"),
        isHalfDay: true,
      }),
    ).toBe(0.5);
  });

  it("charges a half-day on a weekend as 0.5 anyway", () => {
    expect(
      calculateLeaveDays({
        startDate: d("2026-03-07"),
        endDate: d("2026-03-07"),
        isHalfDay: true,
      }),
    ).toBe(0.5);
  });

  it("rejects a half-day spanning more than one date", () => {
    expect(() =>
      calculateLeaveDays({
        startDate: d("2026-03-09"),
        endDate: d("2026-03-10"),
        isHalfDay: true,
      }),
    ).toThrow();
  });

  it("charges weekdays for a full request", () => {
    expect(
      calculateLeaveDays({
        startDate: d("2026-03-09"),
        endDate: d("2026-03-13"),
        isHalfDay: false,
      }),
    ).toBe(5);
  });

  it("rejects an inverted range", () => {
    expect(() =>
      calculateLeaveDays({
        startDate: d("2026-03-13"),
        endDate: d("2026-03-09"),
        isHalfDay: false,
      }),
    ).toThrow();
  });
});

describe("remainingDays", () => {
  it("subtracts used and pending from the entitlement", () => {
    expect(remainingDays({ entitled: 15, used: 4, pending: 1 })).toBe(10);
  });

  it("returns zero when nothing is left", () => {
    expect(remainingDays({ entitled: 12, used: 12, pending: 0 })).toBe(0);
  });

  it("goes negative when usage exceeds the entitlement", () => {
    expect(remainingDays({ entitled: 5, used: 6, pending: 0 })).toBe(-1);
  });

  it("handles half-day amounts without float drift", () => {
    expect(remainingDays({ entitled: 1, used: 0.5, pending: 0 })).toBe(0.5);
    expect(remainingDays({ entitled: 1, used: 0.5, pending: 0.5 })).toBe(0);
  });
});

describe("rangesOverlap", () => {
  const base = { aStart: d("2026-03-09"), aEnd: d("2026-03-13") };

  it("detects a fully contained range", () => {
    expect(
      rangesOverlap(base.aStart, base.aEnd, d("2026-03-10"), d("2026-03-11")),
    ).toBe(true);
  });

  it("detects a partially overlapping range", () => {
    expect(
      rangesOverlap(base.aStart, base.aEnd, d("2026-03-13"), d("2026-03-17")),
    ).toBe(true);
  });

  it("treats adjacent ranges as overlapping on the shared day", () => {
    expect(
      rangesOverlap(base.aStart, base.aEnd, d("2026-03-13"), d("2026-03-17")),
    ).toBe(true);
  });

  it("allows clearly separate ranges", () => {
    expect(
      rangesOverlap(base.aStart, base.aEnd, d("2026-03-16"), d("2026-03-20")),
    ).toBe(false);
  });

  it("detects a half-day colliding with a full-day request", () => {
    expect(
      rangesOverlap(base.aStart, base.aEnd, d("2026-03-11"), d("2026-03-11")),
    ).toBe(true);
  });
});

describe("roundDays", () => {
  it("removes accumulated float error", () => {
    expect(roundDays(0.1 + 0.2)).toBe(0.3);
    expect(roundDays(1.1 + 2.2)).toBe(3.3);
  });

  it("leaves whole numbers untouched", () => {
    expect(roundDays(5)).toBe(5);
  });
});

describe("toDateInput", () => {
  it("round-trips through parseDateInput", () => {
    expect(toDateInput(d("2026-07-04"))).toBe("2026-07-04");
  });
});

describe("currentYear", () => {
  it("returns a plausible year", () => {
    expect(currentYear()).toBeGreaterThanOrEqual(2020);
  });
});
