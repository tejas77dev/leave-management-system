import { requireUser } from "@/lib/auth";
import { getMyBalances } from "@/lib/leave-service";
import { currentYear } from "@/lib/leave-calc";
import { LeaveRequestForm } from "./leave-request-form";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Request leave" };

export default async function NewRequestPage() {
  const user = await requireUser();
  const balances = await getMyBalances(user.id, currentYear());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Request leave"
        description="Weekends are not deducted. Half-days count as 0.5."
      />

      <Card>
        <LeaveRequestForm
          leaveTypes={balances.map((balance) => ({
            id: balance.leaveType.id,
            name: balance.leaveType.name,
            remaining: balance.remaining,
          }))}
        />
      </Card>
    </div>
  );
}
