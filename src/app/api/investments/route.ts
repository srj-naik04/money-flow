import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/investments.repo";
import { investmentCreateSchema } from "@/lib/schemas/investment";

export const GET = withHandler(async (req: NextRequest) => {
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  return ok(await repo.listInvestments(projectId));
});

export const POST = withHandler(async (req: NextRequest) => {
  const input = await parseJson(req, investmentCreateSchema);
  return ok(await repo.createInvestment(input), { status: 201 });
});
