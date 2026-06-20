import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/settings.repo";
import { settingsUpdateSchema } from "@/lib/schemas/settings";

export const GET = withHandler(async () => {
  return ok(await repo.getSettings());
});

export const PATCH = withHandler(async (req: NextRequest) => {
  const input = await parseJson(req, settingsUpdateSchema);
  return ok(await repo.updateSettings(input));
});
