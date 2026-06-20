"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Repeat,
  TrendingUp,
  TriangleAlert,
  Banknote,
  Landmark,
  PiggyBank,
  Vault,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/common/money";
import { useCalendar } from "@/hooks/use-calendar";
import { todayISO, addMonthsISO, formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type {
  CalendarDay,
  CalendarEvent,
} from "@/server/services/calendar.service";

const EVENT_ICON: Record<
  CalendarEvent["kind"],
  { Icon: LucideIcon; cls: string }
> = {
  renewal: { Icon: Repeat, cls: "text-chart-1" },
  investment: { Icon: TrendingUp, cls: "text-chart-7" },
  salary: { Icon: Banknote, cls: "text-positive" },
  emi: { Icon: Landmark, cls: "text-negative" },
  sip: { Icon: PiggyBank, cls: "text-chart-7" },
  deposit: { Icon: Vault, cls: "text-chart-5" },
  maturity: { Icon: Vault, cls: "text-positive" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthMatrix(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export default function CalendarPage() {
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [selected, setSelected] = useState<string | null>(null);
  const calendar = useCalendar(month);
  const today = todayISO();

  const cells = useMemo(() => monthMatrix(month), [month]);
  const dayMap = useMemo(() => {
    const m = new Map<string, CalendarDay>();
    for (const d of calendar.data?.days ?? []) m.set(d.date, d);
    return m;
  }, [calendar.data]);
  const eventMap = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of calendar.data?.events ?? []) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [calendar.data]);

  const [y, mNum] = month.split("-").map(Number);
  const selectedDay = selected ? dayMap.get(selected) : undefined;
  const selectedEvents = selected ? (eventMap.get(selected) ?? []) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Income, expenses, renewals and investments by day."
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setMonth(addMonthsISO(`${month}-01`, -1).slice(0, 7))
              }
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="w-36 text-center text-sm font-medium tabular-nums">
              {MONTHS[mNum - 1]} {y}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setMonth(addMonthsISO(`${month}-01`, 1).slice(0, 7))
              }
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-2 sm:p-3">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="py-1 text-center text-xs font-medium text-muted-foreground"
              >
                {w}
              </div>
            ))}
            {cells.map((date, i) => {
              if (!date)
                return (
                  <div
                    key={`b${i}`}
                    className="aspect-square sm:aspect-[4/3]"
                  />
                );
              const day = dayMap.get(date);
              const events = eventMap.get(date) ?? [];
              const isToday = date === today;
              const num = Number(date.slice(-2));
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  className={cn(
                    "flex aspect-square flex-col gap-0.5 rounded-lg border p-1 text-left transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:aspect-[4/3] sm:p-1.5",
                    selected === date && "ring-2 ring-primary",
                    day?.hasLarge && "border-warning/60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        isToday
                          ? "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {num}
                    </span>
                    <div className="flex gap-0.5">
                      {[...new Set(events.map((e) => e.kind))].map((k) => {
                        const { Icon, cls } = EVENT_ICON[k];
                        return <Icon key={k} className={cn("size-3", cls)} />;
                      })}
                      {day?.hasLarge ? (
                        <TriangleAlert className="size-3 text-warning-foreground" />
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-auto hidden flex-col gap-0.5 text-[10px] leading-tight sm:flex">
                    {day && day.income > 0 ? (
                      <span className="truncate text-positive">
                        +<Money paise={day.income} compact decimals={false} />
                      </span>
                    ) : null}
                    {day && day.expense > 0 ? (
                      <span className="truncate text-negative">
                        −<Money paise={day.expense} compact decimals={false} />
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <h2 className="font-medium">{formatDate(selected)}</h2>
            {selectedDay &&
            (selectedDay.income > 0 || selectedDay.expense > 0) ? (
              <div className="flex gap-6 text-sm">
                {selectedDay.income > 0 ? (
                  <span>
                    <span className="text-muted-foreground">Income </span>
                    <Money
                      paise={selectedDay.income}
                      className="font-medium text-positive"
                    />
                  </span>
                ) : null}
                {selectedDay.expense > 0 ? (
                  <span>
                    <span className="text-muted-foreground">Expense </span>
                    <Money
                      paise={selectedDay.expense}
                      className="font-medium text-negative"
                    />
                  </span>
                ) : null}
                <span className="text-muted-foreground">
                  {selectedDay.count} transactions
                </span>
              </div>
            ) : null}
            {selectedEvents.length > 0 ? (
              <ul className="space-y-1.5">
                {selectedEvents.map((e, i) => {
                  const { Icon, cls } = EVENT_ICON[e.kind];
                  return (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Icon className={cn("size-4", cls)} />
                      <span className="flex-1">{e.name}</span>
                      {e.amount ? (
                        <Money paise={e.amount} className="font-medium" />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {!selectedDay && selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing on this day.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
