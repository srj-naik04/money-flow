import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import { getCalendar } from "@/server/services/calendar.service";
import { todayISO } from "@/lib/date";

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const raw = sp.get("month") ?? "";
  // Fall back to the current month for a missing/malformed param.
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)
    ? raw
    : todayISO().slice(0, 7);
  const projectId = sp.get("projectId") ?? "all";
  return ok(await getCalendar(month, projectId));
});
