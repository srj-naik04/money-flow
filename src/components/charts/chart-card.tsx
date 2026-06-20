import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-2", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="pt-1">{children}</CardContent>
    </Card>
  );
}
