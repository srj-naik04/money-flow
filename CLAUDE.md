@AGENTS.md

# MoneyFlow — project working agreement

## Deployment & data
- **Live (production):** https://money-flow-five-theta.vercel.app/ (Vercel).
- **The Vercel deployment and local dev share the SAME Neon database — it is the production DB.** There is no separate staging/dev database. Any write, migration, seed, or `db:clear` you run locally immediately affects the live site, and vice-versa. Treat all data as production: never wipe or reseed without explicit confirmation, prefer additive/reversible changes, and back up (Backup module / `/api/backup/export`) before destructive operations.
- Migrations apply to this one shared DB. After changing `src/db/schema/*`, run `db:generate`, inspect the SQL, then `db:migrate`. The same schema must satisfy both local and Vercel.

## Auth & multi-tenancy (read before touching `server/` or `db/`)
- **Auth = Neon Auth (hosted Better Auth), `@neondatabase/auth`.** Users sign in with Google; email/password is available for automation when `NEXT_PUBLIC_ENABLE_PASSWORD_AUTH="true"` (off in prod). SDK lives in `src/lib/auth/` (`server.ts`, `client.ts`). Pages are gated by `src/proxy.ts` (Next 16's renamed middleware → redirects to `/auth/sign-in`); the API is gated **fail-closed** in `withHandler` (401 when signed out). Cookies are `sameSite: "lax"` (required so OAuth redirects survive — `"strict"` silently breaks sign-in).
- **Every row is owned by a user. Scope EVERY query.** All data tables have a `user_id` column. `withHandler` resolves the user once and runs the handler inside an `AsyncLocalStorage` context (`src/server/lib/request-context.ts`). In **every** repository/service query you MUST: filter reads/updates/deletes by `eq(table.userId, getCurrentUserId())` (combine via `and(...)`), stamp `userId` on every insert, and match `userId` in enrichment joins. `getCurrentUserId()` throws 401 if no context, so a missed filter fails closed instead of leaking — but a missed filter is still a tenant-isolation bug. Mark only genuinely public routes with `withHandler(fn, { public: true })` (e.g. health).
- **New tables:** add `userId: text("user_id")` + an index, and make any previously-global unique constraint composite-per-user `(userId, …)`. New users are bootstrapped (settings + default categories) lazily in `settings.repo ensureRow`.
- **Tests/ops:** the E2E suite impersonates a user via the `E2E_AUTH_USER_ID` bypass (`src/lib/auth/test-bypass.ts`, inert on Vercel). Setup/handoff lives in `docs/auth-setup.md` (Neon console domains + own Google creds, Vercel env, owner backfill via `scripts/backfill-owner.ts`); automation creds in `docs/automation-login.md`.

## How to work here
- **Be consistent.** Match the existing patterns exactly — the feature-slice stack (schema → `lib/schemas` zod → `types/domain` DTO → `server/repositories` → `app/api` routes → `hooks` → page/components), money as integer **paise**, GST in **basis points**, the query-key factory in `lib/query-keys`, `withHandler` envelopes, **per-user query scoping (see Auth & multi-tenancy)**, Base UI primitives (not Radix), and the existing form/modal/StatCard/EmptyState conventions. New code should be indistinguishable from old code.
- **Extremely user-friendly is the bar.** Minimal, one-tap flows; sensible defaults; clear copy with the fix in error messages; inline validation that focuses the first error; optimistic updates + undo where it helps; never a broken/empty dropdown or dead state. Every module ships a real empty state, loading skeleton, and error state. Honor `prefers-reduced-motion`, keep 44px touch targets, and keep the daily path under ~2 minutes.
- **Test across all viewports.** Verify mobile (~390px), tablet (~768px), desktop (~1280px) and ultrawide (~1920px): no horizontal overflow, the sidebar (desktop) and bottom-nav (mobile) both expose the feature, modals render as bottom sheets on mobile and dialogs on desktop, and content reflows. Add/extend Playwright specs in `tests/e2e` (UI-only — drive the real UI, never call `/api/*` directly) and unit specs in `tests/unit` (Vitest, pure functions). Cover positive, negative, and edge cases.

## Verify before declaring done
`npm run typecheck` · `npm run lint` · `npm run test` (Vitest) · `npm run build` · `npm run test:e2e` (Playwright, runs `next start -p 3001`). All must be green, with no console/hydration errors and no `NaN`/`₹NaN` in the UI.
