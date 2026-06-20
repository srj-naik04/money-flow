"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/error-state";
import { StatCard } from "@/components/common/stat-card";
import { Money, Percent } from "@/components/common/money";
import { ProjectDot } from "@/components/common/project-dot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EntitySelect,
  type SelectOption,
} from "@/components/forms/entity-select";
import { useReport } from "@/hooks/use-reports";
import { downloadText, toCsv } from "@/lib/csv";
import type { ReportPeriod } from "@/types/api";
import type { NamedAmount } from "@/server/services/reports.service";

const periodOptions: SelectOption[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

function CategoryList({
  title,
  items,
}: {
  title: string;
  items: NamedAmount[];
}) {
  const max = Math.max(1, ...items.map((i) => i.amount));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No data
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{i.name}</span>
                  <Money paise={i.amount} className="font-medium" />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${(i.amount / max) * 100}%`,
                      backgroundColor: i.color ?? undefined,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const report = useReport(period);
  const data = report.data;

  const handleExport = () => {
    if (!data) return;
    const rows = data.rows.map((r) => ({
      Period: r.label,
      Income: (r.income / 100).toFixed(2),
      Expense: (r.expense / 100).toFixed(2),
      GST: (r.gst / 100).toFixed(2),
      Net: (r.net / 100).toFixed(2),
      "Savings %": r.savingsRate.toFixed(1),
    }));
    downloadText(`moneyflow-report-${period}.csv`, toCsv(rows));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Performance by period."
        actions={
          <div className="flex items-center gap-2" data-no-print>
            <div className="w-36">
              <EntitySelect
                value={period}
                onChange={(v) => setPeriod(v as ReportPeriod)}
                options={periodOptions}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              aria-label="Export CSV"
            >
              <Download className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.print()}
              aria-label="Print"
            >
              <Printer className="size-4" />
            </Button>
          </div>
        }
      />

      {report.isError && !data ? (
        <ErrorState
          message={(report.error as Error)?.message}
          onRetry={() => void report.refetch()}
        />
      ) : !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border bg-muted/40"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            <StatCard
              label="Income"
              value={<Money paise={data.totals.income} />}
            />
            <StatCard
              label="Expenses"
              value={<Money paise={data.totals.expense} />}
            />
            <StatCard
              label="GST Paid"
              value={<Money paise={data.totals.gst} />}
            />
            <StatCard
              label="Net Profit"
              value={<Money paise={data.totals.net} colorBySign />}
              emphasize
            />
            <StatCard
              label="Savings Rate"
              value={<Percent value={data.totals.savingsRate} />}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                By {period.replace("ly", "")} period
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">
                        Period
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        Income
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        Expense
                      </th>
                      <th className="px-4 py-2 text-right font-medium">GST</th>
                      <th className="px-4 py-2 text-right font-medium">Net</th>
                      <th className="px-4 py-2 text-right font-medium">
                        Savings
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-6 text-center text-muted-foreground"
                        >
                          No data for this period.
                        </td>
                      </tr>
                    ) : (
                      data.rows.map((r) => (
                        <tr
                          key={r.key}
                          className="border-b last:border-b-0 hover:bg-accent/30"
                        >
                          <td className="px-4 py-2 font-medium">{r.label}</td>
                          <td className="px-4 py-2 text-right">
                            <Money paise={r.income} className="text-positive" />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Money
                              paise={r.expense}
                              className="text-negative"
                            />
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">
                            <Money paise={r.gst} />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Money paise={r.net} colorBySign />
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {r.savingsRate.toFixed(1)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryList
              title="Top Expense Categories"
              items={data.topExpenseCategories}
            />
            <CategoryList
              title="Top Income Sources"
              items={data.topIncomeCategories}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Project Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.projectPerformance.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No data
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.projectPerformance.map((p) => (
                    <li
                      key={p.name}
                      className="flex items-center gap-3 rounded-lg border p-2.5"
                    >
                      <ProjectDot color={p.color} />
                      <span className="flex-1 truncate text-sm font-medium">
                        {p.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <Money paise={p.income} compact /> in ·{" "}
                        <Money paise={p.expense} compact /> out
                      </span>
                      <Money
                        paise={p.net}
                        className="w-24 text-right text-sm font-medium"
                        colorBySign
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
