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
- Coverage target: 95% via `@vitest/coverage-v8` (`npm run test:coverage`)

## Local Setup

Fill in `.env.local` per the instructions at the top of that file, then:

```bash
npm run db:push   # apply schema to Neon DB
npm run dev       # start dev server
```
