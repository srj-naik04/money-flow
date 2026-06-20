import { withHandler } from "@/server/http/api-handler";
import { exportSnapshot } from "@/server/services/backup.service";

export const GET = withHandler(async () => {
  const snapshot = await exportSnapshot();
  const date = snapshot.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="moneyflow-backup-${date}.json"`,
    },
  });
});
