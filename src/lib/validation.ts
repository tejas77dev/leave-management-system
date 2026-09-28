import { z } from "zod";
import { DATE_INPUT_PATTERN, isWeekend, parseDateInput } from "@/lib/leave-calc";

export type ActionState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  /** Set only by a completed action, so a fresh form never shows a false success. */
  success?: boolean;
};

export const initialActionState: ActionState = { error: null, fieldErrors: {} };

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const PART_OF_DAY_VALUES = ["MORNING", "AFTERNOON"] as const;

export const leaveRequestSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Choose a leave type"),
    startDate: z.string().regex(DATE_INPUT_PATTERN, "Choose a start date"),
    endDate: z.string().regex(DATE_INPUT_PATTERN, "Choose an end date"),
    isHalfDay: z.boolean(),
    // Strict: a half-day must name exactly one half, and a full day must not
    // smuggle one in. The browser omits the control entirely for a full day.
    partOfDay: z
      .enum(PART_OF_DAY_VALUES, { error: "Choose morning or afternoon" })
      .optional(),
    reason: z.string().max(500, "Keep the reason under 500 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.isHalfDay) {
      if (!data.partOfDay) {
        ctx.addIssue({
          code: "custom",
          path: ["partOfDay"],
          message: "Choose morning or afternoon",
        });
      }
      if (data.startDate !== data.endDate) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "A half-day must fall on a single date",
        });
      }
      if (DATE_INPUT_PATTERN.test(data.startDate) && isWeekend(parseDateInput(data.startDate))) {
        ctx.addIssue({
          code: "custom",
          path: ["startDate"],
          message: "A weekend date has no working half to take",
        });
      }
    } else {
      if (data.partOfDay) {
        ctx.addIssue({
          code: "custom",
          path: ["partOfDay"],
          message: "Only half-day requests can select a half",
        });
      }
      if (data.endDate < data.startDate) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "End date must not be before the start date",
        });
      }
    }
  });

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "Enter a name").max(120),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters"),
  role: z.enum(["EMPLOYEE", "HR"]),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1, "Enter a name").max(120),
  role: z.enum(["EMPLOYEE", "HR"]),
  active: z.boolean(),
});

export const leaveTypeSchema = z.object({
  name: z.string().min(1, "Enter a name").max(60),
  description: z.string().max(200).optional(),
  defaultDays: z.coerce
    .number()
    .min(0, "Cannot be negative")
    .max(365, "That seems too high"),
  active: z.boolean(),
});

export const reviewRequestSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional(),
});

export const setEntitlementSchema = z.object({
  userId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  entitled: z.coerce.number().min(0, "Cannot be negative").max(365),
});

/** Flattens a Zod error into the shape the forms render. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
