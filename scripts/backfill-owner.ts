/**
 * One-time backfill: assign all pre-existing rows (which have user_id = NULL,
 * from before multi-tenancy) to the owner's Neon Auth user.
 *
 * Run AFTER the owner has signed in once with Google (so their user exists in
 * neon_auth."user"). Resolve the owner by email or pass the id directly:
 *
 *   npx tsx scripts/backfill-owner.ts --email=you@example.com
 *   npx tsx scripts/backfill-owner.ts --user=<neon-auth-user-id>
 *
 * Signing in already bootstraps an empty workspace (a settings row + default
 * categories). Those would collide with the incoming NULL-owned settings/
 * categories (per-user unique indexes), so we delete the bootstrap defaults
 * first, then claim the real data. Other tables have no pre-existing user rows.
 *
 * Idempotent: only touches rows where user_id IS NULL (plus the one-time
 * bootstrap cleanup, which is a no-op on a second run).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing from .env.local");
  const sql = neon(url);

  const userArg = process.argv.find((a) => a.startsWith("--user="))?.split("=")[1];
  const emailArg = process.argv.find((a) => a.startsWith("--email="))?.split("=")[1];

  let userId = userArg;
  if (!userId && emailArg) {
    const rows = await sql`
      select id::text as id from neon_auth."user"
      where lower(email) = lower(${emailArg})
      limit 1`;
    if (!rows.length) {
      throw new Error(
        `No Neon Auth user found for ${emailArg}. Sign in once with Google first, then re-run.`,
      );
    }
    userId = rows[0].id as string;
  }
  if (!userId) {
    throw new Error("Usage: tsx scripts/backfill-owner.ts --email=you@example.com (or --user=<id>)");
  }

  console.log(`Backfilling NULL user_id rows → owner ${userId}\n`);

  // Clear the bootstrap-created empty workspace so the real (NULL-owned) rows
  // can take ownership without tripping the per-user unique indexes.
  const removedCats = (await sql`delete from categories where user_id = ${userId} returning id`).length;
  const removedSettings = (await sql`delete from settings where user_id = ${userId} returning id`).length;
  console.log(`Cleared bootstrap defaults: ${removedCats} categories, ${removedSettings} settings\n`);

  const counts: Record<string, number> = {};
  counts.projects = (await sql`update projects set user_id = ${userId} where user_id is null returning id`).length;
  counts.categories = (await sql`update categories set user_id = ${userId} where user_id is null returning id`).length;
  counts.accounts = (await sql`update accounts set user_id = ${userId} where user_id is null returning id`).length;
  counts.transactions = (await sql`update transactions set user_id = ${userId} where user_id is null returning id`).length;
  counts.subscriptions = (await sql`update subscriptions set user_id = ${userId} where user_id is null returning id`).length;
  counts.investments = (await sql`update investments set user_id = ${userId} where user_id is null returning id`).length;
  counts.investment_value_history = (await sql`update investment_value_history set user_id = ${userId} where user_id is null returning id`).length;
  counts.recurring_items = (await sql`update recurring_items set user_id = ${userId} where user_id is null returning id`).length;
  counts.goals = (await sql`update goals set user_id = ${userId} where user_id is null returning id`).length;
  counts.goal_contributions = (await sql`update goal_contributions set user_id = ${userId} where user_id is null returning id`).length;
  counts.deposits = (await sql`update deposits set user_id = ${userId} where user_id is null returning id`).length;
  counts.settings = (await sql`update settings set user_id = ${userId} where user_id is null returning id`).length;

  for (const [table, n] of Object.entries(counts)) {
    console.log(`  ${table.padEnd(26)} ${n}`);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\n✓ Backfilled ${total} rows to ${userId}.`);
}

main().catch((err) => {
  console.error("✗ Backfill failed:", err);
  process.exit(1);
});
