import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/projects.repo";
import { projectCreateSchema } from "@/lib/schemas/project";

export const GET = withHandler(async (req: NextRequest) => {
  const withStats = req.nextUrl.searchParams.get("stats") === "1";
  const data = withStats ? await repo.listProjectsWithStats() : await repo.listProjects();
  return ok(data);
});

export const POST = withHandler(async (req: NextRequest) => {
  const input = await parseJson(req, projectCreateSchema);
  return ok(await repo.createProject(input), { status: 201 });
});
