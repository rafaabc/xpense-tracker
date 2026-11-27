# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Database:** Neon Postgres (serverless) via `@neondatabase/serverless`
- **ORM:** Drizzle ORM (`drizzle-orm/neon-http`)
- **Auth:** Auth.js v5 (`next-auth@beta`) — Google OAuth only, Drizzle adapter
- **Testing:** Vitest (unit/component/mocked-integration/real-dependency) + Playwright (E2E)

## Next.js 16 Breaking Change — Proxy

In Next.js 16 `middleware.ts` is **renamed to `proxy.ts`**. The exported function
is `proxy` (not `middleware`). Auth.js v5 wraps it:

```typescript
// proxy.ts
import { auth } from "@/lib/auth";
export const proxy = auth((req) => { ... });
```

Do NOT create `middleware.ts` — it is deprecated.

## Requirements Documents

All product requirements live in `docs/`:

- `docs/1. user_stories_backlog.md` — 13 user stories across 6 epics
- `docs/2. test_conditions.md` — 132 test conditions mapped from user stories
- `docs/3. test_pyramid_distribution.md` — Test pyramid: 53 unit / 28 mocked-integration / 11 real-dependency / 16 API / 12 E2E
- `docs/4. split_expenses_spec.md` — split expenses: US-16 to US-21, business rules, test conditions, open questions
- `docs/5. split_expenses_plan.md` — split expenses slices and status

`docs/` is gitignored (local only).

## Domain Model

- **User** — authenticated via Google OAuth only; owns all data
- **Group** — top-level expense category; unique per user (case-insensitive)
- **Subcategory** — nested under exactly one Group; unique within parent Group (case-insensitive); parent cannot change after creation
- **Person** — someone the user shares costs with; exactly one per user is the user (`isSelf`, cannot be deleted); unique per user (case-insensitive); holds the default split
- **Expense** — Amount (`numeric(12,2)` > 0.00, ≤2dp, max 9999999999.99), Subcategory, Date (no future dates), payer, split mode (`personal` / `split`) with a snapshot of shares
- **RecurringTemplate** — Amount, Subcategory, StartDate, Interval (monthly/6mo/12mo), dayOfMonth, payer and split (copied to generated expenses); edits are future-only unless the user opts to apply payer/split to the current month
- **Currency preference** — display-only (DKK or BRL, default DKK); never mutates stored values

Cascade rules: deleting a Group hard-deletes all its Subcategories and their Expenses. Deleting a Subcategory hard-deletes its Expenses. Enforced via FK `onDelete: 'cascade'` in `lib/schema.ts`.

## Key Business Rules

- Google OAuth is the only auth method; single identity per Google account
- Cross-tenant protection: `userId` column + `eq(t.userId, session.user.id)` on every query
- Annual average: ÷12 for completed years, ÷elapsed months for current year
- Recurring day-of-month overflow → last day of that month
- Currency change never converts stored values
- Percentages are integer basis points (10000 = 100%); share amounts use integer cents with largest-remainder rounding (ties: payer first, then oldest person) and always add up to the amount
- A `null` payer (legacy rows) means the user paid
- New expenses and templates default to `split` once there are two people
- Balance is per month, without carry-over; personal expenses do not affect it; transfers are matched greedily
- Summaries show full amounts, not the user's share
- A person referenced by an expense or template cannot be deleted

## Server Actions — Errors

A production build hides the message of anything a Server Action throws. Mutations therefore wrap their body in `guard()` and throw `ActionError` (`lib/action-result.ts`), which returns `{ error }`; client components call `unwrap(await action(...))`. Use `rejectDuplicate` for writes that can hit a unique index. Query functions used during RSC render still throw.

neon-http has no interactive transactions: use `db.batch([...])` for writes that must be atomic, generating ids with `crypto.randomUUID()` beforehand.

## Architecture — What We Don't Build

- No monorepo / separate backend — one Next.js app
- No service→repository→route layering — Server Action / RSC → Drizzle directly
- No queue/worker for recurrence — Vercel Cron (`/api/cron/recurring`) + lazy catch-up
- No pagination/virtualization yet (defer until data volumes warrant it)

## Test Strategy

Test pyramid is the acceptance skeleton (see `docs/3. test_pyramid_distribution.md`).
Tests are written **per vertical slice** as each user story is implemented — not upfront.

- Unit + component + mocked-integration: Vitest (`npm run test`)
- Real-dependency: `npm run test:real` (`tests/real/`, `vitest.real.config.ts`). Writes to the database in `.env.local`, so it must point to a non-production branch. Not run in CI
- E2E: Playwright (`npm run test:e2e`)
- Coverage target: 95% via `@vitest/coverage-v8` (`npm run test:coverage`). Statements, lines and functions meet it; branches are at about 90%

## Design System

All UI work **must** use the xpense-design skill before implementing any component or page.

```
/xpense-design
```

Brand summary: emerald green + warm paper neutrals, Space Grotesk display / Hanken Grotesk body / JetBrains Mono numerals, Lucide icons, sentence-case copy, no emoji.

- Tokens, components, and UI kit live in `.claude/skills/xpense-design/`
- Link `.claude/skills/xpense-design/styles.css` for all tokens + fonts
- Use existing primitives (Button, Input, Card, Badge, CategoryTag, TransactionRow, Stat…) — do not invent new ones
- Expenses in ink (`--color-ink`), over-budget in red, amounts in JetBrains Mono

## Slice Completion Status

| Slice | Stories | Status |
|---|---|---|
| 0 — Scaffold | — | ✅ complete |
| 1 — Auth | US-01, US-02 | ✅ complete |
| 2 — Currency + Groups + Subcategories | US-05, US-06, US-07 | ✅ complete |
| 3 — Expense CRUD | US-10, US-11, US-12, US-13 | ✅ complete |
| 4 — Summaries | US-14, US-15 | ✅ complete |
| 5 — Recurrence | US-08, US-09 | ✅ complete |
| 6 — Test Coverage | — | ✅ complete — closed 22 TC-ID gaps; added E2E fixtures + create/monthly tests, cron + engine + expenses mocked-integration, currency/recurring/summaries unit tests (PR #6) |
| 7 — Split expenses | US-16 to US-21 | code complete — see `docs/5. split_expenses_plan.md` |

## Shared Utilities (built in Slice 3)

- `lib/format.ts` — `formatAmount(amount, currency)` — use for all money display
- `lib/validations/expenses.ts` — `validateAmount` + `validateExpenseDate` — reuse for recurring templates (Slice 5). `validateAmount` accepts either `.` or `,` as the decimal separator (DKK/BRL `inputMode="decimal"` keypads emit a comma) and returns `{ ok: true, value }` with `value` normalized to a dot — always persist `value`, never the raw input
- Cross-tenant guard on expenses: `eq(expenses.userId, userId)` — see `app/actions/expenses.ts`

## Shared Utilities (built in Slice 4)

- `lib/summaries.ts` — pure calc functions: `calcMonthlyBreakdown`, `elapsedMonths`, `calcGroupAverages`, `buildMatrix`, `calcMonthTotals`
- `app/actions/summaries.ts` — `getMonthlyRows`, `getAnnualRows`, `getAvailableYears`, `getUserCurrency`
- Neon HTTP compat note: use `select` + `groupBy` for distinct queries — `selectDistinct` generates unqualified column refs

## Shared Utilities (built in Slice 5)

- `lib/recurrence.ts` — pure date/interval logic: `clampDayOfMonth`, `addInterval`, `occurrencesDue`, `nextExecutionDate`, `renewalDueDate`, `isRenewalDue`, `buildSuccessor`, `INTERVALS`
- `lib/validations/recurring.ts` — `validateDayOfMonth`, `validateInterval`, `validateStartDate`
- `lib/recurrence-engine.ts` — session-agnostic: `runCatchUp(userId, today)`, `runCatchUpAllUsers(today)` — shared by expenses-page lazy catch-up + daily Vercel Cron; **never call `revalidatePath` inside this module** — it is called during RSC render; call `revalidatePath` in the caller (cron route handler) only
- `app/actions/recurring.ts` — CRUD + `confirmRenewal`, `updateRenewal`, `getDueRenewals`
- Cron bearer guard: `CRON_SECRET` env var must be set in `.env.local`; Vercel injects it automatically in production
- Idempotency: `lastGeneratedDate` column on `recurringTemplates` — generation emits only dates strictly after this marker

## Shared Utilities (split expenses)

- `lib/split.ts` — `allocateShares`, `toCents`, `fromCents`, `SPLIT_MODES`
- `lib/split-input.ts` — `parseSplit`, `resolveShares` (ownership check); used by expense and template actions
- `lib/settlement.ts` — `calcBalances`, `calcTransfers`
- `lib/people.ts` — `ensureSelfPerson`, `listPeople`; not a Server Action because it takes a `userId`
- `lib/template-shares.ts` — `loadTemplateShares`
- `components/shared/SplitFields.tsx` — `useSplitFields` + payer/split controls for both forms
- `app/actions/balance.ts` — `getMonthlyBalance`; the balance page runs `runCatchUp` first
- `scripts/backfill-self-person.mjs` (`npm run db:backfill`) — idempotent: self person, payer on old rows, links generated expenses to templates
- Person foreign keys use `onDelete: 'no action'` so deleting a user can still cascade

## E2E Test Infrastructure

`playwright.config.ts` loads `.env.local` via `dotenv` and sets `NODE_OPTIONS=--use-system-ca`.

- **dotenv**: Playwright process doesn't inherit Next.js's env loading — must explicitly call `config({ path: '.env.local' })` in `playwright.config.ts`
- **`--use-system-ca`**: Node.js 24 ships a CA bundle that doesn't include Neon's root CA; without this flag, `neon()` HTTP calls from the test process fail with `"unable to verify the first certificate"`
- E2E fixtures (`tests/e2e/fixtures/auth.ts`) connect to Neon directly (not via the app server) to seed/teardown test sessions

## Local Setup

Vercel is the source of truth for env vars (the Development environment points to the Neon `dev` branch):

```bash
vercel link
vercel env pull .env.local
npm run db:push   # apply schema to Neon DB
npm run dev       # start dev server
```

There is no migrations folder. Before merging or deploying a schema change, run `db:push` (and `db:backfill` when needed) against production, only with the owner's approval. CI E2E clones a parent Neon branch, which needs the schema too.
