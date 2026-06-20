"use client";

import dynamic from "next/dynamic";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useProjects } from "@/hooks/use-projects";
import { useActiveProjectId } from "@/hooks/use-active-project";
import { PageHeader } from "@/components/common/page-header";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { UpcomingPayments } from "@/components/dashboard/upcoming-payments";
import { InsightsStrip } from "@/components/insights/insights-strip";
import { ErrorState } from "@/components/common/error-state";

const ProfitTrendCard = dynamic(
  () => import("@/components/dashboard/profit-trend-card").then((m) => m.ProfitTrendCard),
  { ssr: false, loading: () => <div className="h-full min-h-[340px] animate-pulse rounded-xl border bg-muted/40" /> },
);

export default function DashboardPage() {
  const stats = useDashboardStats();
  const activeProjectId = useActiveProjectId();
  const { data: projects } = useProjects();
  const activeName =
    activeProjectId === "all"
      ? "All Projects"
      : (projects?.find((p) => p.id === activeProjectId)?.name ?? "Project");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Financial health · ${activeName}`}
      />

      {stats.isError && !stats.data ? (
        <ErrorState
          message={(stats.error as Error)?.message}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <div className="space-y-6">
          <InsightsStrip />
          <KpiGrid stats={stats.data} loading={stats.isLoading && !stats.data} />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ProfitTrendCard />
            </div>
            <div className="lg:col-span-1">
              {stats.data ? (
                <UpcomingPayments payments={stats.data.upcomingPayments} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
