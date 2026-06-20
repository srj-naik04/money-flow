import { withHandler } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/accounts.repo";

export const GET = withHandler(async () => {
  return ok(await repo.spendingBySourceThisMonth());
});
