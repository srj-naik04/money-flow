"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Upload,
  FileSpreadsheet,
  DatabaseBackup,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useSettings } from "@/hooks/use-settings";
import { useImportBackup } from "@/hooks/use-backup";
import { downloadText } from "@/lib/csv";
import { formatDate } from "@/lib/date";
import { todayISO } from "@/lib/date";

export default function BackupPage() {
  const { data: settings } = useSettings();
  const importBackup = useImportBackup();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingSnapshot, setPendingSnapshot] = useState<unknown>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleExportJson = async () => {
    try {
      const res = await fetch("/api/backup/export");
      if (!res.ok) throw new Error("Export failed");
      const text = await res.text();
      downloadText(
        `moneyflow-backup-${todayISO()}.json`,
        text,
        "application/json",
      );
      toast.success("Backup downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await fetch("/api/transactions/export");
      if (!res.ok) throw new Error("Export failed");
      const text = await res.text();
      downloadText(`moneyflow-transactions-${todayISO()}.csv`, text);
      toast.success("CSV downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setPendingSnapshot(parsed);
        setConfirmOpen(true);
      } catch {
        toast.error("That doesn't look like a valid backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Backup" description="Export and restore your data." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="size-4 text-muted-foreground" /> Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Download a full JSON snapshot you can restore later, or a CSV of
              all transactions.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleExportJson} className="gap-2">
                <DatabaseBackup className="size-4" /> Export full backup (JSON)
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCsv}
                className="gap-2"
              >
                <FileSpreadsheet className="size-4" /> Export transactions (CSV)
              </Button>
            </div>
            {settings?.lastBackupAt ? (
              <p className="text-xs text-muted-foreground">
                Last backup: {formatDate(settings.lastBackupAt.slice(0, 10))}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No backups yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="size-4 text-muted-foreground" /> Restore
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Import a JSON backup. This{" "}
              <span className="font-medium text-foreground">replaces</span> all
              current data.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onFilePicked}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="gap-2"
            >
              <Upload className="size-4" /> Choose backup file
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) setPendingSnapshot(null);
        }}
        title="Restore this backup?"
        description="This replaces ALL current data with the contents of the backup file. Export a backup first if you're unsure."
        confirmLabel="Replace & restore"
        destructive
        loading={importBackup.isPending}
        onConfirm={() =>
          importBackup.mutate(pendingSnapshot, {
            onSuccess: (r) => {
              const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
              toast.success(`Restored ${total} records`);
              setConfirmOpen(false);
              setPendingSnapshot(null);
            },
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : "Import failed"),
          })
        }
      />
    </div>
  );
}
