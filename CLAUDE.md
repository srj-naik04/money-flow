@AGENTS.md

# MoneyFlow — project working agreement

## Deployment & data
- **Live (production):** https://money-flow-five-theta.vercel.app/ (Vercel).
- **The Vercel deployment and local dev share the SAME Neon database — it is the production DB.** There is no separate staging/dev database. Any write, migration, seed, or `db:clear` you run locally immediately affects the live site, and vice-versa. Treat all data as production: never wipe or reseed without explicit confirmation, prefer additive/reversible changes, and back up (Backup module / `/api/backup/export`) before destructive operations.
- Migrations apply to this one shared DB. After changing `src/db/schema/*`, run `db:generate`, inspect the SQL, then `db:migrate`. The same schema must satisfy both local and Vercel.

## How to work here
- **Be consistent.** Match the existing patterns exactly — the feature-slice stack (schema → `lib/schemas` zod → `types/domain` DTO → `server/repositories` → `app/api` routes → `hooks` → page/components), money as integer **paise**, GST in **basis points**, the query-key factory in `lib/query-keys`, `withHandler` envelopes, Base UI primitives (not Radix), and the existing form/modal/StatCard/EmptyState conventions. New code should be indistinguishable from old code.
- **Extremely user-friendly is the bar.** Minimal, one-tap flows; sensible defaults; clear copy with the fix in error messages; inline validation that focuses the first error; optimistic updates + undo where it helps; never a broken/empty dropdown or dead state. Every module ships a real empty state, loading skeleton, and error state. Honor `prefers-reduced-motion`, keep 44px touch targets, and keep the daily path under ~2 minutes.
- **Test across all viewports.** Verify mobile (~390px), tablet (~768px), desktop (~1280px) and ultrawide (~1920px): no horizontal overflow, the sidebar (desktop) and bottom-nav (mobile) both expose the feature, modals render as bottom sheets on mobile and dialogs on desktop, and content reflows. Add/extend Playwright specs in `tests/e2e` (UI-only — drive the real UI, never call `/api/*` directly) and unit specs in `tests/unit` (Vitest, pure functions). Cover positive, negative, and edge cases.

## Verify before declaring done
`npm run typecheck` · `npm run lint` · `npm run test` (Vitest) · `npm run build` · `npm run test:e2e` (Playwright, runs `next start -p 3001`). All must be green, with no console/hydration errors and no `NaN`/`₹NaN` in the UI.
