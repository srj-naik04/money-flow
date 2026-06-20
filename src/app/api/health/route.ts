import { withHandler } from "@/server/http/api-handler";
import { ok, fail } from "@/server/http/respond";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const GET = withHandler(async () => {
  try {
    await db.execute(sql`select 1`);
    return ok({ db: "up" });
  } catch {
    return fail({ code: "db_unreachable", message: "Database unreachable" }, 503);
  }
});
