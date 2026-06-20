"use client";

import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectDot } from "@/components/common/project-dot";
import { useProjects } from "@/hooks/use-projects";
import { useUiStore } from "@/stores/ui-store";

export function ProjectFilter() {
  const { data: projects } = useProjects();
  const activeProjectId = useUiStore((s) => s.activeProjectId);
  const setActiveProject = useUiStore((s) => s.setActiveProject);

  const active = projects?.find((p) => p.id === activeProjectId);
  const isAll = activeProjectId === "all" || !active;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="gap-2" />}
      >
        {!isAll ? <ProjectDot color={active!.color} /> : null}
        <span className="max-w-32 truncate">{isAll ? "All Projects" : active!.name}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
          Filter by project
        </div>
        <DropdownMenuItem onClick={() => setActiveProject("all")}>
          <span className="flex-1">All Projects</span>
          {isAll ? <Check className="size-4" /> : null}
        </DropdownMenuItem>
        {projects && projects.length > 0 ? <DropdownMenuSeparator /> : null}
        {projects?.map((p) => (
          <DropdownMenuItem key={p.id} onClick={() => setActiveProject(p.id)}>
            <ProjectDot color={p.color} />
            <span className="flex-1 truncate">{p.name}</span>
            {activeProjectId === p.id ? <Check className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
