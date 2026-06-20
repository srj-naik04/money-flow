import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";
import * as relations from "./relations";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.");
}

// Module-level singleton — the neon-http driver is stateless per request,
// so reuse one client across all route handlers.
const sql = neon(databaseUrl);

export const db = drizzle(sql, {
  schema: { ...schema, ...relations },
});

export type Database = typeof db;
export { schema };
