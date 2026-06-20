import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/projects.repo";
import {
  projectUpdateSchema,
  projectDeleteSchema,
} from "@/lib/schemas/project";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return ok(await repo.getProject(id));
});

export const PATCH = withHandler<Ctx>(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, projectUpdateSchema);
  return ok(await repo.updateProject(id, input));
});

export const DELETE = withHandler<Ctx>(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // no body -> default block mode
  }
  const input = projectDeleteSchema.parse(body ?? {});
  await repo.deleteProject(id, input.mode, input.reassignToId);
  return ok({ id });
});
