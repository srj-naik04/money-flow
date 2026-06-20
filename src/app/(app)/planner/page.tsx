"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RecurringPanel } from "@/components/planner/recurring-panel";
import { GoalsPanel } from "@/components/planner/goals-panel";
import { SubscriptionsPanel } from "@/components/subscriptions/subscriptions-panel";

const TABS = [
  { value: "income", label: "Income" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "emi", label: "Loans & EMIs" },
  { value: "sip", label: "SIPs" },
  { value: "goals", label: "Goals" },
] as const;
type TabKey = (typeof TABS)[number]["value"];

export default function PlannerPage() {
  const [tab, setTab] = useState<TabKey>("income");

  // Deep-link support: read ?tab= on mount, and reflect changes back to the URL.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    if (p && TABS.some((t) => t.value === p)) setTab(p as TabKey);
  }, []);

  const onChange = (value: string) => {
    setTab(value as TabKey);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planner"
        description="Salary, subscriptions, EMIs, SIPs and savings goals — your recurring money in one place."
      />
      <Tabs value={tab} onValueChange={(v) => onChange(String(v))}>
        <TabsList className="w-full max-w-full overflow-x-auto sm:w-fit">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="income">
          <RecurringPanel template="salary" />
        </TabsContent>
        <TabsContent value="subscriptions">
          <SubscriptionsPanel />
        </TabsContent>
        <TabsContent value="emi">
          <RecurringPanel template="emi" />
        </TabsContent>
        <TabsContent value="sip">
          <RecurringPanel template="sip" />
        </TabsContent>
        <TabsContent value="goals">
          <GoalsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
