# Slice 0 — Scaffold Implementation Plan

**Status:** ✅ Complete (merged to main, commit `c0fd7db` + `da9f740`)

**Goal:** Bootstrap Next.js 16 app with full domain schema, Drizzle ORM, Auth.js v5 skeleton, and deploy config.

**User Stories:** None (infrastructure only — enables all future slices)

**Test Conditions covered:** None (no behavioral TCs at scaffold level)

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/schema.ts` | Full domain schema: users, accounts, sessions, verificationTokens, groups, subcategories, expenses, recurringTemplates |
| `lib/db.ts` | Neon serverless DB client |
| `lib/auth.ts` | Auth.js v5 config — Google provider, DrizzleAdapter, session callback |
| `proxy.ts` | Next.js 16 route guard (replaces middleware.ts) |
| `app/page.tsx` | Landing page with "Sign in with Google" button |
| `app/(app)/layout.tsx` | Auth-gated layout shell |
| `app/(app)/dashboard/page.tsx` | Empty dashboard shell |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth GET/POST route handler |
| `app/layout.tsx` | Root layout |
| `drizzle.config.ts` | Drizzle Kit config pointing to Neon DB |
| `vitest.config.ts` | Vitest config — jsdom, @vitejs/plugin-react, `@` alias |
| `tests/setup.ts` | `@testing-library/jest-dom` import |
| `vercel.json` | Vercel deployment config |
| `.env.local` | Template with required env var keys |

## Tasks

- [x] Init Next.js 16 with App Router, TypeScript, Tailwind CSS v4
- [x] Install deps: drizzle-orm, @neondatabase/serverless, next-auth@beta, @auth/drizzle-adapter, zod
- [x] Install devDeps: vitest, @vitejs/plugin-react, @testing-library/react, @testing-library/jest-dom, jsdom, dotenv-cli, drizzle-kit
- [x] Write full domain schema in `lib/schema.ts` (FK cascades, case-insensitive unique indexes)
- [x] Write `lib/db.ts` (Neon HTTP driver)
- [x] Write `lib/auth.ts` (Google OAuth, DrizzleAdapter, session callback)
- [x] Write `proxy.ts` (Next.js 16 — NOT middleware.ts; unauthenticated redirect)
- [x] Write landing page (`app/page.tsx`) with Google sign-in button
- [x] Write auth-gated layout (`app/(app)/layout.tsx`)
- [x] Write dashboard shell (`app/(app)/dashboard/page.tsx`)
- [x] Write NextAuth route handler (`app/api/auth/[...nextauth]/route.ts`)
- [x] Configure Drizzle Kit (`drizzle.config.ts`)
- [x] Configure Vitest (`vitest.config.ts`) — jsdom env, globals, `@` path alias
- [x] Add `db:push` script using dotenv-cli: `dotenv -e .env.local -- drizzle-kit push`
- [x] Push schema to Neon DB (`npm run db:push`)
- [x] Commit

---

## Key Decisions

- **`proxy.ts` not `middleware.ts`** — Next.js 16 renamed the export; Auth.js v5 wraps with `auth()`
- **No service layer** — Server Actions / RSC call Drizzle directly
- **`currency` on users table** — display-only preference (DKK | BRL), default DKK
- **FK `onDelete: 'cascade'`** — Group→Subcategory→Expense cascade enforced at DB level
- **Case-insensitive unique indexes** — `lower(name)` expression indexes on groups and subcategories
