// Session-agnostic generation engine shared by the daily cron and dashboard lazy catch-up.
// Imports db directly — no 'use server', no auth() — so cron routes can import without a session.

import { db } from '@/lib/db'
import { expenses, expenseShares, recurringTemplates } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { occurrencesDue } from '@/lib/recurrence'
import type { RecurringTemplate } from '@/lib/recurrence'
import { allocateShares } from '@/lib/split'
import { loadTemplateShares } from '@/lib/template-shares'

type TemplateRow = RecurringTemplate

/**
 * For a single user: load their active templates, insert due expenses,
 * advance lastGeneratedDate. Idempotent — safe to call on every dashboard load.
 */
export async function runCatchUp(userId: string, today: string): Promise<void> {
  const templates = await db
    .select()
    .from(recurringTemplates)
    .where(and(eq(recurringTemplates.userId, userId), eq(recurringTemplates.active, true)))

  await _processTemplates(templates as TemplateRow[], today)
}

/**
 * For all users: used by the Vercel Cron job.
 */
export async function runCatchUpAllUsers(today: string): Promise<void> {
  const templates = await db
    .select()
    .from(recurringTemplates)
    .where(eq(recurringTemplates.active, true))

  await _processTemplates(templates as TemplateRow[], today)
}

async function _processTemplates(templates: TemplateRow[], today: string): Promise<void> {
  for (const tmpl of templates) {
    const dates = occurrencesDue(tmpl, today)
    if (dates.length === 0) continue

    const splitMode = tmpl.splitMode ?? 'personal'
    const payerPersonId = tmpl.payerPersonId ?? null
    const shares = splitMode === 'split' ? await loadTemplateShares(tmpl.id, tmpl.userId) : []

    // Bulk-insert all due expense rows
    const rows = dates.map((date) => ({
      // The id is generated here so the shares can be written in the same batch
      id: crypto.randomUUID(),
      userId: tmpl.userId,
      subcategoryId: tmpl.subcategoryId,
      amount: tmpl.amount,
      date,
      recurringTemplateId: tmpl.id,
      payerPersonId,
      splitMode,
    }))

    const shareRows = shares.length
      ? rows.flatMap((row) =>
          allocateShares(row.amount, shares, payerPersonId ?? '').map((s) => ({
            expenseId: row.id,
            personId: s.personId,
            shareBps: s.bps,
            amount: s.amount,
          })),
        )
      : []

    // Expenses, shares and the progress marker are written atomically
    const lastDate = dates[dates.length - 1]
    await db.batch([
      db.insert(expenses).values(rows),
      ...(shareRows.length ? [db.insert(expenseShares).values(shareRows)] : []),
      db
        .update(recurringTemplates)
        .set({ lastGeneratedDate: lastDate })
        .where(eq(recurringTemplates.id, tmpl.id)),
    ])
  }
}
