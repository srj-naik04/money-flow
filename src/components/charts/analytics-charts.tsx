"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartCard } from "./chart-card";
import { EmptyState } from "@/components/common/empty-state";
import { BarChart3 } from "lucide-react";
import { formatINR, formatINRCompact } from "@/lib/money";
import { CYCLE_MONTHS, PROJECT_COLORS } from "@/lib/constants";
import { useChartColors } from "@/hooks/use-chart-colors";
import type { AnalyticsBundle } from "@/server/services/analytics.service";
import type { SubscriptionDTO } from "@/types/domain";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const monthLabel = (m: unknown) => {
  const s = String(m ?? "");
  const parts = s.split("-");
  const idx = Number(parts[1]) - 1;
  return `${MONTHS[idx] ?? s}${parts[1] === "01" ? ` '${parts[0].slice(2)}` : ""}`;
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--popover-foreground)",
    fontSize: 12,
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)",
  },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 4 },
  formatter: (v: unknown) => formatINR(Number(v)),
} as const;

const H = 240;

export function AnalyticsCharts({
  data,
  subscriptions,
}: {
  data: AnalyticsBundle;
  subscriptions: SubscriptionDTO[];
}) {
  const c = useChartColors();
  const { monthly, expenseByCategory, projectProfit, investmentGrowth } = data;
  const axis = {
    stroke: c["--muted-foreground"],
    fontSize: 11,
    tickLine: false,
    axisLine: false,
  };
  const grid = {
    stroke: c["--border"],
    strokeDasharray: "3 3",
    vertical: false,
  };
  const cursor = { fill: c["--accent"] };

  const subMap = new Map<string, number>();
  for (const s of subscriptions.filter((x) => x.status === "active")) {
    const monthlyCost = Math.round(s.amount / CYCLE_MONTHS[s.billingCycle]);
    const key = s.categoryName ?? "Other";
    subMap.set(key, (subMap.get(key) ?? 0) + monthlyCost);
  }
  const subsByCategory = [...subMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const hasData =
    monthly.some((m) => m.income || m.expense) ||
    expenseByCategory.length > 0 ||
    investmentGrowth.some((g) => g.value > 0) ||
    subsByCategory.length > 0;
  if (!hasData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Nothing to chart yet"
        description="Add some transactions to see analytics for this period."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Income vs Expense">
        <ResponsiveContainer width="100%" height={H}>
          <BarChart data={monthly} barGap={2}>
            <CartesianGrid {...grid} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
            <YAxis tickFormatter={formatINRCompact} width={52} {...axis} />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={monthLabel}
              cursor={cursor}
            />
            <Bar
              dataKey="income"
              name="Income"
              fill={c["--chart-2"]}
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="expense"
              name="Expense"
              fill={c["--chart-4"]}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Profit Trend">
        <ResponsiveContainer width="100%" height={H}>
          <LineChart data={monthly}>
            <CartesianGrid {...grid} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
            <YAxis tickFormatter={formatINRCompact} width={52} {...axis} />
            <Tooltip {...tooltipStyle} labelFormatter={monthLabel} />
            <Line
              type="monotone"
              dataKey="net"
              name="Net profit"
              stroke={c["--chart-1"]}
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cashflow (cumulative)">
        <ResponsiveContainer width="100%" height={H}>
          <AreaChart data={monthly}>
            <defs>
              <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={c["--chart-5"]}
                  stopOpacity={0.4}
                />
                <stop offset="95%" stopColor={c["--chart-5"]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...grid} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
            <YAxis tickFormatter={formatINRCompact} width={52} {...axis} />
            <Tooltip {...tooltipStyle} labelFormatter={monthLabel} />
            <Area
              type="monotone"
              dataKey="cumulative"
              name="Cashflow"
              stroke={c["--chart-5"]}
              strokeWidth={2}
              fill="url(#cf)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="GST Paid Trend">
        <ResponsiveContainer width="100%" height={H}>
          <AreaChart data={monthly}>
            <defs>
              <linearGradient id="gst" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={c["--chart-3"]}
                  stopOpacity={0.4}
                />
                <stop offset="95%" stopColor={c["--chart-3"]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...grid} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
            <YAxis tickFormatter={formatINRCompact} width={52} {...axis} />
            <Tooltip {...tooltipStyle} labelFormatter={monthLabel} />
            <Area
              type="monotone"
              dataKey="gst"
              name="GST"
              stroke={c["--chart-3"]}
              strokeWidth={2}
              fill="url(#gst)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Expense Breakdown">
        <ResponsiveContainer width="100%" height={H}>
          <PieChart>
            <Pie
              data={expenseByCategory}
              dataKey="amount"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {expenseByCategory.map((s, i) => (
                <Cell
                  key={s.name}
                  fill={s.color ?? PROJECT_COLORS[i % PROJECT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top Categories">
        <ResponsiveContainer width="100%" height={H}>
          <BarChart
            data={expenseByCategory.slice(0, 7)}
            layout="vertical"
            margin={{ left: 8 }}
          >
            <XAxis type="number" tickFormatter={formatINRCompact} {...axis} />
            <YAxis type="category" dataKey="name" width={90} {...axis} />
            <Tooltip {...tooltipStyle} cursor={cursor} />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {expenseByCategory.slice(0, 7).map((s, i) => (
                <Cell
                  key={s.name}
                  fill={s.color ?? PROJECT_COLORS[i % PROJECT_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Project-wise Profit">
        <ResponsiveContainer width="100%" height={H}>
          <BarChart data={projectProfit}>
            <CartesianGrid {...grid} />
            <XAxis dataKey="name" {...axis} />
            <YAxis tickFormatter={formatINRCompact} width={52} {...axis} />
            <Tooltip {...tooltipStyle} cursor={cursor} />
            <Bar dataKey="net" name="Net profit" radius={[3, 3, 0, 0]}>
              {projectProfit.map((p) => (
                <Cell key={p.name} fill={p.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Burn Rate (monthly expense)">
        <ResponsiveContainer width="100%" height={H}>
          <LineChart data={monthly}>
            <CartesianGrid {...grid} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
            <YAxis tickFormatter={formatINRCompact} width={52} {...axis} />
            <Tooltip {...tooltipStyle} labelFormatter={monthLabel} />
            <Line
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke={c["--chart-4"]}
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Investment Growth">
        <ResponsiveContainer width="100%" height={H}>
          <AreaChart data={investmentGrowth}>
            <defs>
              <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={c["--chart-7"]}
                  stopOpacity={0.4}
                />
                <stop offset="95%" stopColor={c["--chart-7"]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...grid} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
            <YAxis tickFormatter={formatINRCompact} width={52} {...axis} />
            <Tooltip {...tooltipStyle} labelFormatter={monthLabel} />
            <Area
              type="monotone"
              dataKey="value"
              name="Portfolio"
              stroke={c["--chart-7"]}
              strokeWidth={2}
              fill="url(#ig)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Subscription Cost (monthly, by category)">
        {subsByCategory.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            No active subscriptions
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={H}>
            <PieChart>
              <Pie
                data={subsByCategory}
                dataKey="amount"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {subsByCategory.map((s, i) => (
                  <Cell
                    key={s.name}
                    fill={PROJECT_COLORS[i % PROJECT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
