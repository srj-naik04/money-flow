import { PageHeader } from "@/components/common/page-header";
import { SubscriptionsPanel } from "@/components/subscriptions/subscriptions-panel";

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="Recurring costs and renewals." />
      <SubscriptionsPanel />
    </div>
  );
}
