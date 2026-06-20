import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import { search } from "@/server/services/search.service";

export const GET = withHandler(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return ok(await search(q));
});
