"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { BarChart3 } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";
import { useChartColors } from "@/hooks/use-chart-colors";
import { formatINR, formatINRCompact } from "@/lib/money";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: unknown) => {
  const parts = String(m ?? "").split("-");
  return MONTHS[Number(parts[1]) - 1] ?? String(m);
};

export function ProfitTrendCard() {
  const analytics = useAnalytics("6m");
  const c = useChartColors();
  const data = analytics.data?.monthly ?? [];
  const hasData = data.some((m) => m.income || m.expense);

  return (
    <Card className="h-full">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Profit Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {!analytics.data ? (
          <div className="h-[260px] animate-pulse rounded-lg bg-muted/40" />
        ) : !hasData ? (
          <EmptyState icon={BarChart3} title="No activity yet" description="Add income or expenses to see trends." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data}>
              <CartesianGrid stroke={c["--border"]} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickFormatter={monthLabel} stroke={c["--muted-foreground"]} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatINRCompact} width={52} stroke={c["--muted-foreground"]} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                labelFormatter={monthLabel}
                formatter={(v: unknown) => formatINR(Number(v))}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
              />
              <Bar dataKey="income" name="Income" fill={c["--chart-2"]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill={c["--chart-4"]} radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="net" name="Net profit" stroke={c["--chart-1"]} strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
