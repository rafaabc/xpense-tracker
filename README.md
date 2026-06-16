# xpense-tracker

Personal expense tracking app. Groups and subcategories, recurring templates, monthly/annual summaries, multi-currency display.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Neon Postgres** (serverless) via `@neondatabase/serverless`
- **Drizzle ORM** (`drizzle-orm/neon-http`)
- **Auth.js v5** — Google OAuth only
- **Vercel** for deployment + cron (daily recurring expense generation)
- **Vitest** (unit / mocked-integration) + **Playwright** (E2E)

## Local setup

1. Copy `.env.local.example` → `.env.local` and fill in:
   - `DATABASE_URL` — Neon connection string
   - `AUTH_SECRET` — random secret (`openssl rand -base64 32`)
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google OAuth credentials
   - `CRON_SECRET` — secret for the recurring-expense cron endpoint

2. Push schema and start dev server:

```bash
npm run db:push   # apply schema to Neon DB
npm run dev       # http://localhost:3000
```

## Testing

```bash
npm run test            # unit + mocked-integration (watch)
npm run test:coverage   # coverage report
npm run test:e2e        # Playwright E2E (requires dev server or starts one)
npm run lint            # ESLint
```

## Project docs

- `CLAUDE.md` — codebase guidance (architecture, stack, test strategy)
- `docs/` (gitignored) — user stories, test conditions, implementation plans
