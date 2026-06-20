"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/error-state";
import { EntitySelect, type SelectOption } from "@/components/forms/entity-select";
import { useAnalytics } from "@/hooks/use-analytics";
import { useSubscriptions } from "@/hooks/use-subscriptions";
import type { AnalyticsRange } from "@/types/api";

const AnalyticsCharts = dynamic(
  () => import("@/components/charts/analytics-charts").then((m) => m.AnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
    ),
  },
);

const rangeOptions: SelectOption[] = [
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "ytd", label: "Year to date" },
  { value: "fy", label: "This financial year" },
  { value: "all", label: "All time" },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("12m");
  const analytics = useAnalytics(range);
  const subs = useSubscriptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Trends across income, expenses, GST and investments."
        actions={
          <div className="w-44">
            <EntitySelect
              value={range}
              onChange={(v) => setRange(v as AnalyticsRange)}
              options={rangeOptions}
            />
          </div>
        }
      />

      {analytics.isError && !analytics.data ? (
        <ErrorState
          message={(analytics.error as Error)?.message}
          onRetry={() => void analytics.refetch()}
        />
      ) : !analytics.data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : (
        <AnalyticsCharts data={analytics.data} subscriptions={subs.data ?? []} />
      )}
    </div>
  );
}
