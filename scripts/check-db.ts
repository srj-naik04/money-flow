import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing from .env.local");
  const sql = neon(url);
  const rows = await sql`select 1 as ok, current_database() as db, version() as version, now() as now`;
  const row = rows[0] as Record<string, unknown>;
  console.log("✓ Neon reachable");
  console.log("  db:     ", row.db);
  console.log("  now:    ", row.now);
  console.log("  version:", String(row.version).split(",")[0]);
}

main().catch((err) => {
  console.error("✗ Neon connectivity FAILED:", err.message);
  process.exit(1);
});
