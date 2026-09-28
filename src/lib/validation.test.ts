import { describe, expect, it } from "vitest";
import { leaveRequestSchema } from "@/lib/validation";

const base = {
  leaveTypeId: "lt_1",
  startDate: "2026-06-08",
  endDate: "2026-06-08",
  isHalfDay: false,
  reason: "",
};

function parse(overrides: Partial<typeof base> & { partOfDay?: string }) {
  return leaveRequestSchema.safeParse({ ...base, ...overrides });
}

/** Collects the messages reported against a single field. */
function messagesFor(result: ReturnType<typeof parse>, field: string): string[] {
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
}

describe("leaveRequestSchema: full days", () => {
  it("accepts a plain weekday range with no partOfDay", () => {
    const result = parse({ startDate: "2026-06-08", endDate: "2026-06-12" });
    expect(result.success).toBe(true);
  });

  it("rejects a partOfDay on a full-day request", () => {
    const result = parse({
      startDate: "2026-06-08",
      endDate: "2026-06-12",
      partOfDay: "MORNING",
    });
    expect(result.success).toBe(false);
    expect(messagesFor(result, "partOfDay")).toContain(
      "Only half-day requests can select a half",
    );
  });

  it("rejects an end date before the start date", () => {
    const result = parse({ startDate: "2026-06-12", endDate: "2026-06-08" });
    expect(result.success).toBe(false);
    expect(messagesFor(result, "endDate")).toContain(
      "End date must not be before the start date",
    );
  });
});

describe("leaveRequestSchema: half-days", () => {
  it("accepts morning and afternoon on a single weekday", () => {
    expect(parse({ isHalfDay: true, partOfDay: "MORNING" }).success).toBe(true);
    expect(parse({ isHalfDay: true, partOfDay: "AFTERNOON" }).success).toBe(true);
  });

  it("requires a half to be chosen", () => {
    const result = parse({ isHalfDay: true });
    expect(result.success).toBe(false);
    expect(messagesFor(result, "partOfDay")).toContain("Choose morning or afternoon");
  });

  it("rejects an unknown half", () => {
    const result = parse({ isHalfDay: true, partOfDay: "MIDDAY" });
    expect(result.success).toBe(false);
    expect(messagesFor(result, "partOfDay")).toContain("Choose morning or afternoon");
  });

  it("rejects a half-day that spans more than one date", () => {
    const result = parse({ isHalfDay: true, partOfDay: "MORNING", endDate: "2026-06-09" });
    expect(result.success).toBe(false);
    expect(messagesFor(result, "endDate")).toContain("A half-day must fall on a single date");
  });

  it("rejects a half-day on a Saturday", () => {
    // 2026-06-13 is a Saturday.
    const result = parse({ isHalfDay: true, partOfDay: "MORNING", startDate: "2026-06-13", endDate: "2026-06-13" });
    expect(result.success).toBe(false);
    expect(messagesFor(result, "startDate")).toContain(
      "A weekend date has no working half to take",
    );
  });

  it("rejects a half-day on a Sunday", () => {
    // 2026-06-14 is a Sunday.
    const result = parse({ isHalfDay: true, partOfDay: "AFTERNOON", startDate: "2026-06-14", endDate: "2026-06-14" });
    expect(result.success).toBe(false);
    expect(messagesFor(result, "startDate")).toContain(
      "A weekend date has no working half to take",
    );
  });
});
