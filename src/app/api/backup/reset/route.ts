import { NextRequest } from "next/server";
import { z } from "zod";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import { resetDatabase } from "@/server/services/backup.service";

const schema = z.object({ mode: z.enum(["seed", "clear"]) });

export const POST = withHandler(async (req: NextRequest) => {
  const { mode } = await parseJson(req, schema);
  await resetDatabase(mode);
  return ok({ mode });
});
