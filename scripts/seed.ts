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

  // Seeding/clearing is per-user — require an explicit target so we can never
  // touch another user's (or everyone's) data by accident.
  const userArg = process.argv
    .find((a) => a.startsWith("--user="))
    ?.split("=")[1];
  const userId = userArg ?? process.env.SEED_USER_ID;
  if (!userId) {
    throw new Error(
      "Provide a target user id: `--user=<id>` or SEED_USER_ID=<id>. Seeding/clearing is per-user.",
    );
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema: { ...schema, ...relations } });

  if (process.argv.includes("--clear")) {
    await clearDatabase(db, userId);
    console.log(`✓ Cleared all data for user ${userId}`);
  } else {
    await seedDatabase(db, userId);
    console.log(
      `✓ Seeded sample data for user ${userId} (projects, subscriptions, investments, transactions)`,
    );
  }
}

main().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
