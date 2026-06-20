import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/accounts.repo";
import { accountCreateSchema } from "@/lib/schemas/account";

export const GET = withHandler(async () => {
  return ok(await repo.listAccounts());
});

export const POST = withHandler(async (req: NextRequest) => {
  const input = await parseJson(req, accountCreateSchema);
  return ok(await repo.createAccount(input), { status: 201 });
});
