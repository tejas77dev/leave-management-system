import { requireUser } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { ChangePasswordForm } from "./change-password-form";
import Link from "next/link";

export const metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Change password"
        description="Use at least 8 characters."
        action={
          <Link href="/requests" className="text-sm font-medium text-slate-900 underline">
            Back to my leave
          </Link>
        }
      />

      <div className="max-w-md">
        <Card>
          <ChangePasswordForm />
        </Card>
      </div>
    </div>
  );
}
