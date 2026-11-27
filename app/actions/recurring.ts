'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  recurringTemplates, recurringTemplateShares, expenses, expenseShares, subcategories, groups,
} from '@/lib/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { parseSplit, resolveShares, type SplitPayload } from '@/lib/split-input'
import { allocateShares, type ShareBps } from '@/lib/split'
import { loadTemplateShares } from '@/lib/template-shares'
import { validateAmount } from '@/lib/validations/expenses'
import { validateDayOfMonth, validateInterval, validateStartDate } from '@/lib/validations/recurring'
import { nextExecutionDate, renewalDueDate, isRenewalDue, buildSuccessor } from '@/lib/recurrence'
import type { Interval, RecurringTemplate } from '@/lib/recurrence'
import { revalidatePath } from 'next/cache'
import type { RecurringTemplateRow } from '@/lib/types'
import { ActionError, guard } from '@/lib/action-result'

async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) throw new ActionError('Unauthorized')
  return session.user.id
}

async function assertSubcategoryOwnership(subcategoryId: string, userId: string) {
  const [sub] = await db
    .select({ id: subcategories.id })
    .from(subcategories)
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(and(eq(subcategories.id, subcategoryId), eq(groups.userId, userId)))
  if (!sub) throw new ActionError('Subcategory not found')
}

async function assertTemplateOwnership(id: string, userId: string): Promise<RecurringTemplate> {
  const [tmpl] = await db
    .select()
    .from(recurringTemplates)
    .where(and(eq(recurringTemplates.id, id), eq(recurringTemplates.userId, userId)))
  if (!tmpl) throw new ActionError('Recurring template not found')
  return tmpl as RecurringTemplate
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecurringPayload extends SplitPayload {
  amount: string
  subcategoryId: string
  startDate: string
  interval: string
  dayOfMonth: string
}

function toShareRows(templateId: string, shares: ShareBps[]) {
  return shares.map(({ personId, bps }) => ({ templateId, personId, shareBps: bps }))
}

/** Statements giving this month's expenses of a template its new payer and split. */
async function applyToThisMonth(
  templateId: string,
  userId: string,
  split: Pick<SplitPayload, 'payerPersonId' | 'splitMode'>,
  shares: ShareBps[],
) {
  const month = new Date().toISOString().slice(0, 7)
  const rows = await db
    .select({ id: expenses.id, amount: expenses.amount })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.recurringTemplateId, templateId),
        sql`to_char(${expenses.date}::date, 'YYYY-MM') = ${month}`,
      ),
    )
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  // Amounts stay as generated; only the shares are recomputed from them
  const shareRows = rows.flatMap((row) =>
    allocateShares(row.amount, shares, split.payerPersonId).map((s) => ({
      expenseId: row.id,
      personId: s.personId,
      shareBps: s.bps,
      amount: s.amount,
    })),
  )

  return [
    db
      .update(expenses)
      .set({ payerPersonId: split.payerPersonId, splitMode: split.splitMode })
      .where(and(eq(expenses.userId, userId), inArray(expenses.id, ids))),
    db.delete(expenseShares).where(inArray(expenseShares.expenseId, ids)),
    ...(shareRows.length ? [db.insert(expenseShares).values(shareRows)] : []),
  ]
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createRecurringTemplate(payload: RecurringPayload) {
  return guard(async () => {
    const userId = await requireSession()

    const amountVal = validateAmount(payload.amount)
    if (!amountVal.ok) throw new ActionError(amountVal.error)

    const startDateVal = validateStartDate(payload.startDate)
    if (!startDateVal.ok) throw new ActionError(startDateVal.error)

    const intervalVal = validateInterval(payload.interval)
    if (!intervalVal.ok) throw new ActionError(intervalVal.error)

    const domVal = validateDayOfMonth(payload.dayOfMonth)
    if (!domVal.ok) throw new ActionError(domVal.error)

    const parsedShares = parseSplit(payload)

    await assertSubcategoryOwnership(payload.subcategoryId, userId)
    const shares = await resolveShares(payload.payerPersonId, parsedShares, userId)

    const id = crypto.randomUUID()
    const insertTemplate = db
      .insert(recurringTemplates)
      .values({
        id,
        userId,
        subcategoryId: payload.subcategoryId,
        amount: amountVal.value,
        startDate: payload.startDate,
        interval: payload.interval as Interval,
        dayOfMonth: parseInt(payload.dayOfMonth, 10),
        active: true,
        payerPersonId: payload.payerPersonId,
        splitMode: payload.splitMode,
      })
      .returning()

    const [[tmpl]] = await db.batch([
      insertTemplate,
      ...(shares.length ? [db.insert(recurringTemplateShares).values(toShareRows(id, shares))] : []),
    ])

    revalidatePath('/recurring')
    return tmpl
  })
}

export async function updateRecurringTemplate(
  id: string,
  payload: RecurringPayload,
  options: { applyToCurrentMonth?: boolean } = {},
) {
  return guard(async () => {
    const userId = await requireSession()

    const amountVal = validateAmount(payload.amount)
    if (!amountVal.ok) throw new ActionError(amountVal.error)

    const intervalVal = validateInterval(payload.interval)
    if (!intervalVal.ok) throw new ActionError(intervalVal.error)

    const domVal = validateDayOfMonth(payload.dayOfMonth)
    if (!domVal.ok) throw new ActionError(domVal.error)

    const parsedShares = parseSplit(payload)

    await assertTemplateOwnership(id, userId)
    await assertSubcategoryOwnership(payload.subcategoryId, userId)
    const shares = await resolveShares(payload.payerPersonId, parsedShares, userId)
    const { payerPersonId, splitMode } = payload

    const currentMonth = options.applyToCurrentMonth
      ? await applyToThisMonth(id, userId, { payerPersonId, splitMode }, shares)
      : []

    await db.batch([
      db
        .update(recurringTemplates)
        .set({
          amount: amountVal.value,
          subcategoryId: payload.subcategoryId,
          interval: payload.interval as Interval,
          dayOfMonth: parseInt(payload.dayOfMonth, 10),
          payerPersonId,
          splitMode,
        })
        .where(and(eq(recurringTemplates.id, id), eq(recurringTemplates.userId, userId))),
      db.delete(recurringTemplateShares).where(eq(recurringTemplateShares.templateId, id)),
      ...(shares.length ? [db.insert(recurringTemplateShares).values(toShareRows(id, shares))] : []),
      ...currentMonth,
    ])

    revalidatePath('/recurring')
    revalidatePath('/expenses')
  })
}

export async function deleteRecurringTemplate(id: string) {
  return guard(async () => {
    const userId = await requireSession()
    await assertTemplateOwnership(id, userId)

    await db.delete(recurringTemplates).where(eq(recurringTemplates.id, id))

    revalidatePath('/recurring')
  })
}

export async function listRecurringTemplates(): Promise<RecurringTemplateRow[]> {
  const userId = await requireSession()
  return selectActiveTemplates(userId, new Date().toISOString().slice(0, 10))
}

async function selectActiveTemplates(userId: string, today: string): Promise<RecurringTemplateRow[]> {
  const rows = await db
    .select({
      id: recurringTemplates.id,
      userId: recurringTemplates.userId,
      amount: recurringTemplates.amount,
      subcategoryId: subcategories.id,
      subcategoryName: subcategories.name,
      groupId: groups.id,
      groupName: groups.name,
      startDate: recurringTemplates.startDate,
      interval: recurringTemplates.interval,
      dayOfMonth: recurringTemplates.dayOfMonth,
      active: recurringTemplates.active,
      lastRenewedAt: recurringTemplates.lastRenewedAt,
      lastGeneratedDate: recurringTemplates.lastGeneratedDate,
      payerPersonId: recurringTemplates.payerPersonId,
      splitMode: recurringTemplates.splitMode,
    })
    .from(recurringTemplates)
    .innerJoin(subcategories, eq(recurringTemplates.subcategoryId, subcategories.id))
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(and(eq(recurringTemplates.userId, userId), eq(recurringTemplates.active, true)))

  const shares = rows.some((r) => r.splitMode === 'split')
    ? await db
        .select({
          templateId: recurringTemplateShares.templateId,
          personId: recurringTemplateShares.personId,
          shareBps: recurringTemplateShares.shareBps,
        })
        .from(recurringTemplateShares)
        .innerJoin(recurringTemplates, eq(recurringTemplateShares.templateId, recurringTemplates.id))
        .where(eq(recurringTemplates.userId, userId))
    : []

  return rows.map((r) => ({
    ...r,
    interval: r.interval as Interval,
    nextExecutionDate: nextExecutionDate(r as RecurringTemplate, today),
    shares: shares
      .filter((s) => s.templateId === r.id)
      .map(({ personId, shareBps }) => ({ personId, shareBps })),
  }))
}

// ─── Renewal ─────────────────────────────────────────────────────────────────

/** TC-09-05: Confirm same value — extend by 12 months, no new template */
export async function confirmRenewal(id: string) {
  return guard(async () => {
    const userId = await requireSession()
    const tmpl = await assertTemplateOwnership(id, userId)

    await db
      .update(recurringTemplates)
      .set({ lastRenewedAt: renewalDueDate(tmpl) })
      .where(eq(recurringTemplates.id, id))

    revalidatePath('/expenses')
  })
}

/** TC-09-06/07/08: Update value — deprecate old, create successor */
export async function updateRenewal(id: string, newAmount: string) {
  return guard(async () => {
    const userId = await requireSession()

    const amountVal = validateAmount(newAmount)
    if (!amountVal.ok) throw new ActionError(amountVal.error)

    const tmpl = await assertTemplateOwnership(id, userId)
    const successor = buildSuccessor(tmpl, amountVal.value)

    const split = tmpl.splitMode === 'split'
    const shares = split ? await loadTemplateShares(id, userId) : []
    const successorId = crypto.randomUUID()

    await db.batch([
      // The old template releases its people so they can be deleted later
      db
        .update(recurringTemplates)
        .set({ active: false, payerPersonId: null, splitMode: 'personal' })
        .where(and(eq(recurringTemplates.id, id), eq(recurringTemplates.userId, userId))),
      ...(split ? [db.delete(recurringTemplateShares).where(eq(recurringTemplateShares.templateId, id))] : []),
      // Insert successor (active by default)
      db.insert(recurringTemplates).values({
        id: successorId,
        userId: successor.userId,
        subcategoryId: successor.subcategoryId,
        amount: successor.amount,
        startDate: successor.startDate,
        interval: successor.interval,
        dayOfMonth: successor.dayOfMonth,
        active: true,
        lastGeneratedDate: successor.lastGeneratedDate ?? undefined,
        payerPersonId: tmpl.payerPersonId ?? null,
        splitMode: tmpl.splitMode ?? 'personal',
      }),
      ...(shares.length
        ? [db.insert(recurringTemplateShares).values(toShareRows(successorId, shares))]
        : []),
    ])

    revalidatePath('/expenses')
    revalidatePath('/recurring')
  })
}

/** Active templates whose annual renewal is overdue — for the dashboard banner */
export async function getDueRenewals(): Promise<RecurringTemplateRow[]> {
  const userId = await requireSession()
  const today = new Date().toISOString().slice(0, 10)

  const templates = await selectActiveTemplates(userId, today)

  return templates.filter((t) => isRenewalDue(t, today))
}
