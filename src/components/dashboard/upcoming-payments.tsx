import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/common/money";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";
import type { UpcomingPaymentDTO } from "@/types/domain";
import type { RenewalBucket } from "@/lib/finance/renewals";

const bucketStyles: Record<RenewalBucket, string> = {
  overdue: "bg-negative-muted text-negative",
  next7: "bg-warning-muted text-warning-foreground",
  next30: "bg-info-muted text-info-foreground",
  later: "bg-muted text-muted-foreground",
};

function dueLabel(p: UpcomingPaymentDTO): string {
  if (p.daysUntil < 0) return `${Math.abs(p.daysUntil)}d overdue`;
  if (p.daysUntil === 0) return "Today";
  if (p.daysUntil === 1) return "Tomorrow";
  return `in ${p.daysUntil}d`;
}

export function UpcomingPayments({
  payments,
}: {
  payments: UpcomingPaymentDTO[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-muted-foreground" />
          Upcoming Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing due soon"
            description="No subscription renewals in the next 30 days."
          />
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[p.projectName, p.categoryName]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Money paise={p.amount} className="text-sm font-medium" />
                  <div className="mt-0.5">
                    <span
                      className={cn(
                        "inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        bucketStyles[p.bucket],
                      )}
                    >
                      {dueLabel(p)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
