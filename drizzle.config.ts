import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use the direct (non-pooler) endpoint for DDL/migrations when available.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
