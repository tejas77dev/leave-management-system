"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { fieldErrorsFrom, loginSchema, type ActionState } from "@/lib/validation";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  if (!user || !user.active) {
    return { error: "Incorrect email or password.", fieldErrors: {} };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Incorrect email or password.", fieldErrors: {} };
  }

  await createSession(user.id);
  redirect("/dashboard");
}
