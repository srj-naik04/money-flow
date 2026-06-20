import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/recurring.repo";
import { recurringCreateSchema } from "@/lib/schemas/recurring";
import { zRecurringTemplate } from "@/lib/schemas/shared";

export const GET = withHandler(async (req: NextRequest) => {
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  const templateRaw = req.nextUrl.searchParams.get("template");
  const parsed = templateRaw ? zRecurringTemplate.safeParse(templateRaw) : null;
  const template = parsed && parsed.success ? parsed.data : undefined;
  return ok(await repo.listRecurring({ projectId, template }));
});

export const POST = withHandler(async (req: NextRequest) => {
  const input = await parseJson(req, recurringCreateSchema);
  return ok(await repo.createRecurring(input), { status: 201 });
});
