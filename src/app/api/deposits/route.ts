import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/deposits.repo";
import { depositCreateSchema } from "@/lib/schemas/deposit";
import { zDepositType } from "@/lib/schemas/shared";

export const GET = withHandler(async (req: NextRequest) => {
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  const typeRaw = req.nextUrl.searchParams.get("type");
  const parsed = typeRaw ? zDepositType.safeParse(typeRaw) : null;
  const type = parsed && parsed.success ? parsed.data : undefined;
  return ok(await repo.listDeposits({ projectId, type }));
});

export const POST = withHandler(async (req: NextRequest) => {
  const input = await parseJson(req, depositCreateSchema);
  return ok(await repo.createDeposit(input), { status: 201 });
});
