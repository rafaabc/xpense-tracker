# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Database:** Neon Postgres (serverless) via `@neondatabase/serverless`
- **ORM:** Drizzle ORM (`drizzle-orm/neon-http`)
- **Auth:** Auth.js v5 (`next-auth@beta`) — Google OAuth only, Drizzle adapter
- **Testing:** Vitest (unit/component/mocked-integration) + Playwright (E2E)

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

## Domain Model

- **User** — authenticated via Google OAuth only; owns all data
- **Group** — top-level expense category; unique per user (case-insensitive)
- **Subcategory** — nested under exactly one Group; unique within parent Group (case-insensitive); parent cannot change after creation
- **Expense** — Amount (`numeric(12,2)` > 0.00, ≤2dp), Subcategory, Date (no future dates)
- **RecurringTemplate** — Amount, Subcategory, StartDate, Interval (monthly/6mo/12mo), dayOfMonth; edits are future-only
- **Currency preference** — display-only (DKK or BRL, default DKK); never mutates stored values

Cascade rules: deleting a Group hard-deletes all its Subcategories and their Expenses. Deleting a Subcategory hard-deletes its Expenses. Enforced via FK `onDelete: 'cascade'` in `lib/schema.ts`.

## Key Business Rules

- Google OAuth is the only auth method; single identity per Google account
- Cross-tenant protection: `userId` column + `eq(t.userId, session.user.id)` on every query
- Annual average: ÷12 for completed years, ÷elapsed months for current year
- Recurring day-of-month overflow → last day of that month
- Currency change never converts stored values

## Architecture — What We Don't Build

- No monorepo / separate backend — one Next.js app
- No service→repository→route layering — Server Action / RSC → Drizzle directly
- No queue/worker for recurrence — Vercel Cron (`/api/cron/recurring`) + lazy catch-up
- No pagination/virtualization yet (defer until data volumes warrant it)

## Test Strategy

Test pyramid is the acceptance skeleton (see `docs/3. test_pyramid_distribution.md`).
Tests are written **per vertical slice** as each user story is implemented — not upfront.

- Unit + component + mocked-integration: Vitest (`npm run test`)
- Real-dependency + API-contract: Vitest against an ephemeral Neon branch DB
- E2E: Playwright (`npm run test:e2e`)
- Coverage target: 95% via `@vitest/coverage-v8` (`npm run test:coverage`) — installed, lib/ files tracked at 100% in HTML report (terminal reporter skips them; this is a vitest display quirk, not a coverage gap)

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

## Shared Utilities (built in Slice 3)

- `lib/format.ts` — `formatAmount(amount, currency)` — use for all money display
- `lib/validations/expenses.ts` — `validateAmount` + `validateExpenseDate` — reuse for recurring templates (Slice 5)
- Cross-tenant guard on expenses: `eq(expenses.userId, userId)` — see `app/actions/expenses.ts`

## Shared Utilities (built in Slice 4)

- `lib/summaries.ts` — pure calc functions: `calcMonthlyBreakdown`, `elapsedMonths`, `calcGroupAverages`, `buildMatrix`, `calcMonthTotals`
- `app/actions/summaries.ts` — `getMonthlyRows`, `getAnnualRows`, `getAvailableYears`, `getUserCurrency`
- Neon HTTP compat note: use `select` + `groupBy` for distinct queries — `selectDistinct` generates unqualified column refs

## Shared Utilities (built in Slice 5)

- `lib/recurrence.ts` — pure date/interval logic: `clampDayOfMonth`, `addInterval`, `occurrencesDue`, `nextExecutionDate`, `renewalDueDate`, `isRenewalDue`, `buildSuccessor`, `INTERVALS`
- `lib/validations/recurring.ts` — `validateDayOfMonth`, `validateInterval`, `validateStartDate`
- `lib/recurrence-engine.ts` — session-agnostic: `runCatchUp(userId, today)`, `runCatchUpAllUsers(today)` — shared by dashboard lazy catch-up + daily Vercel Cron
- `app/actions/recurring.ts` — CRUD + `confirmRenewal`, `updateRenewal`, `getDueRenewals`
- Cron bearer guard: `CRON_SECRET` env var must be set in `.env.local`; Vercel injects it automatically in production
- Idempotency: `lastGeneratedDate` column on `recurringTemplates` — generation emits only dates strictly after this marker

## Local Setup

Fill in `.env.local` per the instructions at the top of that file, then:

```bash
npm run db:push   # apply schema to Neon DB
npm run dev       # start dev server
```
