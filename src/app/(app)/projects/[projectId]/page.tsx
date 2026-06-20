"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Receipt,
  TrendingUp,
  Landmark,
  Flame,
  CreditCard,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Money } from "@/components/common/money";
import { ProjectDot } from "@/components/common/project-dot";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useProject } from "@/hooks/use-projects";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useSubscriptions } from "@/hooks/use-subscriptions";
import { useTransactions } from "@/hooks/use-transactions";
import { formatDateShort } from "@/lib/date";
import { cn } from "@/lib/utils";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const stats = useDashboardStats(projectId);
  const subs = useSubscriptions(projectId);
  const txns = useTransactions({ projectId, sort: "date_desc" });

  const s = stats.data;
  const recent = txns.data?.pages[0]?.items.slice(0, 8) ?? [];
  const projSubs = (subs.data ?? [])
    .filter((x) => x.status === "active")
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/projects" />}
          aria-label="Back to projects"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader
          title={project.data?.name ?? "Project"}
          description={project.data?.description ?? "Project overview"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Income"
          value={<Money paise={s?.totalIncome ?? 0} />}
          icon={Banknote}
          loading={!s}
        />
        <StatCard
          label="Expenses"
          value={<Money paise={s?.totalExpense ?? 0} />}
          icon={Receipt}
          loading={!s}
        />
        <StatCard
          label="Net Profit"
          value={<Money paise={s?.netProfit ?? 0} colorBySign />}
          icon={TrendingUp}
          loading={!s}
        />
        <StatCard
          label="GST Paid"
          value={<Money paise={s?.totalGstPaid ?? 0} />}
          icon={Landmark}
          loading={!s}
        />
        <StatCard
          label="Monthly Burn"
          value={<Money paise={s?.monthlyBurnRate ?? 0} />}
          icon={Flame}
          loading={!s}
        />
        <StatCard
          label="Recurring / mo"
          value={<Money paise={s?.recurringSubscriptionCost ?? 0} />}
          icon={CreditCard}
          loading={!s}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState icon={Receipt} title="No transactions yet" />
            ) : (
              <ul className="divide-y">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t.categoryName ?? t.vendor ?? t.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateShort(t.occurredAt)}
                      </p>
                    </div>
                    <Money
                      paise={t.signedAmount}
                      className="text-sm font-medium"
                      colorBySign
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            {projSubs.length === 0 ? (
              <EmptyState icon={CreditCard} title="No subscriptions" />
            ) : (
              <ul className="divide-y">
                {projSubs.map((x) => (
                  <li key={x.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {x.projectColor ? (
                          <ProjectDot color={x.projectColor} />
                        ) : null}
                        <span className="truncate text-sm font-medium">
                          {x.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {x.billingCycle.replace("_", "-")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Next {formatDateShort(x.nextDue)}
                      </p>
                    </div>
                    <Money paise={x.amount} className="text-sm font-medium" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
