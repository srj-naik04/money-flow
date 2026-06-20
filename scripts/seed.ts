import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import * as relations from "../src/db/relations";
import { seedDatabase, clearDatabase } from "../src/db/seed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing from .env.local");
  const sql = neon(url);
  const db = drizzle(sql, { schema: { ...schema, ...relations } });

  if (process.argv.includes("--clear")) {
    await clearDatabase(db);
    console.log("✓ Cleared all data");
  } else {
    await seedDatabase(db);
    console.log("✓ Seeded sample data (4 projects, subscriptions, investments, transactions)");
  }
}

main().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
