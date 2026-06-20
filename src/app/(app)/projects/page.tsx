"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  FolderKanban,
  ArchiveRestore,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Money } from "@/components/common/money";
import { ProjectDot } from "@/components/common/project-dot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectFormModal } from "@/components/projects/project-form-modal";
import {
  useProjectsWithStats,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/use-projects";
import type { ProjectWithStatsDTO } from "@/types/domain";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const { data, isLoading, isError, error, refetch } = useProjectsWithStats();
  const update = useUpdateProject();
  const del = useDeleteProject();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectWithStatsDTO | undefined>();
  const [deleting, setDeleting] = useState<ProjectWithStatsDTO | undefined>();

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (p: ProjectWithStatsDTO) => {
    setEditing(p);
    setFormOpen(true);
  };

  const toggleArchive = (p: ProjectWithStatsDTO) => {
    update.mutate(
      { id: p.id, input: { isArchived: !p.isArchived } },
      {
        onSuccess: () =>
          toast.success(p.isArchived ? "Project restored" : "Project archived"),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    del.mutate(
      { id: deleting.id, input: { mode: "cascade" } },
      {
        onSuccess: () => {
          toast.success("Project deleted");
          setDeleting(undefined);
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Couldn't delete"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Organize income and expenses by project."
        actions={
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" /> New Project
          </Button>
        }
      />

      {isError && !data ? (
        <ErrorState
          message={(error as Error)?.message}
          onRetry={() => void refetch()}
        />
      ) : !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start tracking by client or product."
          action={
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="size-4" /> New Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((p) => (
            <div
              key={p.id}
              className={cn(
                "rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-sm",
                p.isArchived && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ProjectDot color={p.color} className="size-3" />
                  <Link
                    href={`/projects/${p.id}`}
                    className="truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {p.name}
                  </Link>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Project actions"
                      />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(p)}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleArchive(p)}>
                      {p.isArchived ? (
                        <>
                          <ArchiveRestore className="size-4" /> Restore
                        </>
                      ) : (
                        <>
                          <Archive className="size-4" /> Archive
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleting(p)}
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {p.status === "completed" ? "Completed" : "Active"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {p.txnCount} txns
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Income</p>
                  <Money
                    paise={p.income}
                    className="font-medium text-positive"
                    compact
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expense</p>
                  <Money
                    paise={p.expense}
                    className="font-medium text-negative"
                    compact
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net</p>
                  <Money
                    paise={p.net}
                    className="font-medium"
                    colorBySign
                    compact
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Delete ${deleting?.name ?? "project"}?`}
        description={
          deleting && deleting.txnCount > 0
            ? `This permanently deletes the project and its ${deleting.txnCount} transactions. Consider archiving instead.`
            : "This permanently deletes the project."
        }
        confirmLabel="Delete everything"
        destructive
        loading={del.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
