"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import type { ProjectDTO, ProjectWithStatsDTO } from "@/types/domain";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectDeleteInput,
} from "@/lib/schemas/project";

export function useProjects() {
  return useQuery({
    queryKey: qk.projects(),
    queryFn: ({ signal }) => api.get<ProjectDTO[]>("/api/projects", signal),
  });
}

export function useProjectsWithStats() {
  return useQuery({
    queryKey: [...qk.projects(), "stats"],
    queryFn: ({ signal }) =>
      api.get<ProjectWithStatsDTO[]>("/api/projects?stats=1", signal),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: qk.project(id ?? ""),
    queryFn: ({ signal }) => api.get<ProjectDTO>(`/api/projects/${id}`, signal),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectCreateInput) =>
      api.post<ProjectDTO>("/api/projects", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProjectUpdateInput }) =>
      api.patch<ProjectDTO>(`/api/projects/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ProjectDeleteInput }) =>
      api.del<{ id: string }>(
        `/api/projects/${id}`,
        input ?? { mode: "block" },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
