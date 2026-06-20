"use client";

import { useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  EntitySelect,
  type SelectOption,
} from "@/components/forms/entity-select";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useProjects } from "@/hooks/use-projects";
import { useResetData } from "@/hooks/use-backup";
import { GST_RATES_BPS, formatGstRate } from "@/lib/money";
import { toPaise } from "@/lib/money";

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

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="sm:w-56">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const { data: projects } = useProjects();
  const reset = useResetData();
  const { theme, setTheme } = useTheme();
  const [confirmReseed, setConfirmReseed] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [threshold, setThreshold] = useState<string>("");

  const projectOptions: SelectOption[] = [
    { value: "all", label: "All Projects" },
    ...(projects ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];
  const monthOptions: SelectOption[] = MONTHS.map((m, i) => ({
    value: String(i + 1),
    label: m,
  }));
  const gstOptions: SelectOption[] = GST_RATES_BPS.map((r) => ({
    value: String(r),
    label: formatGstRate(r),
  }));

  const save = (patch: Parameters<typeof update.mutate>[0]) =>
    update.mutate(patch, {
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Couldn't save"),
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Preferences and data management."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <Row label="Theme" description="Light, dark, or match your system.">
            <EntitySelect
              value={theme ?? "system"}
              onChange={(v) => {
                setTheme(v);
                save({ theme: v as "light" | "dark" | "system" });
              }}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
            />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <Row
            label="Default project"
            description="Pre-selected in quick-add forms."
          >
            <EntitySelect
              value={settings?.defaultProjectId ?? "all"}
              onChange={(v) =>
                save({ defaultProjectId: v === "all" ? null : v })
              }
              options={projectOptions}
            />
          </Row>
          <Row
            label="Financial year starts"
            description="India's FY starts in April."
          >
            <EntitySelect
              value={String(settings?.fyStartMonth ?? 4)}
              onChange={(v) => save({ fyStartMonth: Number(v) })}
              options={monthOptions}
            />
          </Row>
          <Row
            label="Default GST rate"
            description="Pre-filled when GST is enabled."
          >
            <EntitySelect
              value={String(settings?.defaultGstRateBps ?? 1800)}
              onChange={(v) => save({ defaultGstRateBps: Number(v) })}
              options={gstOptions}
            />
          </Row>
          <Row
            label="Large-payment threshold"
            description="Calendar highlight. Use Auto for P90."
          >
            <div className="flex gap-2">
              <Input
                inputMode="decimal"
                placeholder={
                  settings?.largePaymentThreshold
                    ? String(settings.largePaymentThreshold / 100)
                    : "Auto"
                }
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                onBlur={() => {
                  if (threshold === "") return;
                  save({ largePaymentThreshold: toPaise(threshold) / 100 });
                  setThreshold("");
                  toast.success("Saved");
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  save({ largePaymentThreshold: null });
                  setThreshold("");
                  toast.success("Set to Auto");
                }}
              >
                Auto
              </Button>
            </div>
          </Row>
          <Row
            label="Include archived projects"
            description="Count archived projects in 'All' totals."
          >
            <div className="flex justify-end">
              <Switch
                checked={settings?.includeArchivedInTotals ?? false}
                onCheckedChange={(v) => save({ includeArchivedInTotals: v })}
              />
            </div>
          </Row>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-destructive">
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <Row
            label="Reset to sample data"
            description="Replace everything with the demo dataset."
          >
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setConfirmReseed(true)}
            >
              <RotateCcw className="size-4" /> Reseed
            </Button>
          </Row>
          <Row
            label="Clear all data"
            description="Delete every transaction, project and more."
          >
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="size-4" /> Clear everything
            </Button>
          </Row>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmReseed}
        onOpenChange={setConfirmReseed}
        title="Reset to sample data?"
        description="This replaces all current data with the demo dataset. Export a backup first if you want to keep it."
        confirmLabel="Reseed"
        loading={reset.isPending}
        onConfirm={() =>
          reset.mutate("seed", {
            onSuccess: () => {
              toast.success("Sample data restored");
              setConfirmReseed(false);
            },
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : "Reset failed"),
          })
        }
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear all data?"
        description="This permanently deletes everything. This cannot be undone."
        confirmLabel="Delete everything"
        destructive
        loading={reset.isPending}
        onConfirm={() =>
          reset.mutate("clear", {
            onSuccess: () => {
              toast.success("All data cleared");
              setConfirmClear(false);
            },
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : "Clear failed"),
          })
        }
      />
    </div>
  );
}
