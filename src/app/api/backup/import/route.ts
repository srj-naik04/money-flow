import { NextRequest } from "next/server";
import { z } from "zod";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import { importSnapshot } from "@/server/services/backup.service";

const schema = z.object({ snapshot: z.unknown() });

export const POST = withHandler(async (req: NextRequest) => {
  const { snapshot } = await parseJson(req, schema);
  return ok(await importSnapshot(snapshot));
});
