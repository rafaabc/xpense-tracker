// Session-agnostic generation engine shared by the daily cron and dashboard lazy catch-up.
// Imports db directly — no 'use server', no auth() — so cron routes can import without a session.

import { db } from '@/lib/db'
import { expenses, recurringTemplates } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { occurrencesDue } from '@/lib/recurrence'
import type { RecurringTemplate } from '@/lib/recurrence'

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

    // Bulk-insert all due expense rows
    const rows = dates.map((date) => ({
      userId: tmpl.userId,
      subcategoryId: tmpl.subcategoryId,
      amount: tmpl.amount,
      date,
    }))

    await db.insert(expenses).values(rows)

    // Advance the progress marker to the latest generated date
    const lastDate = dates[dates.length - 1]
    await db
      .update(recurringTemplates)
      .set({ lastGeneratedDate: lastDate })
      .where(eq(recurringTemplates.id, tmpl.id))
  }
}
