'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { recurringTemplates, subcategories, groups } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { validateAmount } from '@/lib/validations/expenses'
import { validateDayOfMonth, validateInterval, validateStartDate } from '@/lib/validations/recurring'
import { nextExecutionDate, renewalDueDate, isRenewalDue, buildSuccessor } from '@/lib/recurrence'
import type { Interval, RecurringTemplate } from '@/lib/recurrence'
import { revalidatePath } from 'next/cache'
import type { RecurringTemplateRow } from '@/lib/types'
export type { RecurringTemplateRow }

async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

async function assertSubcategoryOwnership(subcategoryId: string, userId: string) {
  const [sub] = await db
    .select({ id: subcategories.id })
    .from(subcategories)
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(and(eq(subcategories.id, subcategoryId), eq(groups.userId, userId)))
  if (!sub) throw new Error('Subcategory not found')
}

async function assertTemplateOwnership(id: string, userId: string): Promise<RecurringTemplate> {
  const [tmpl] = await db
    .select()
    .from(recurringTemplates)
    .where(and(eq(recurringTemplates.id, id), eq(recurringTemplates.userId, userId)))
  if (!tmpl) throw new Error('Recurring template not found')
  return tmpl as RecurringTemplate
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecurringPayload {
  amount: string
  subcategoryId: string
  startDate: string
  interval: string
  dayOfMonth: string
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createRecurringTemplate(payload: RecurringPayload) {
  const userId = await requireSession()

  const amountVal = validateAmount(payload.amount)
  if (!amountVal.ok) throw new Error(amountVal.error)

  const startDateVal = validateStartDate(payload.startDate)
  if (!startDateVal.ok) throw new Error(startDateVal.error)

  const intervalVal = validateInterval(payload.interval)
  if (!intervalVal.ok) throw new Error(intervalVal.error)

  const domVal = validateDayOfMonth(payload.dayOfMonth)
  if (!domVal.ok) throw new Error(domVal.error)

  await assertSubcategoryOwnership(payload.subcategoryId, userId)

  const [tmpl] = await db
    .insert(recurringTemplates)
    .values({
      userId,
      subcategoryId: payload.subcategoryId,
      amount: payload.amount.trim(),
      startDate: payload.startDate,
      interval: payload.interval as Interval,
      dayOfMonth: parseInt(payload.dayOfMonth, 10),
      active: true,
    })
    .returning()

  revalidatePath('/recurring')
  return tmpl
}

export async function updateRecurringTemplate(id: string, payload: RecurringPayload) {
  const userId = await requireSession()

  const amountVal = validateAmount(payload.amount)
  if (!amountVal.ok) throw new Error(amountVal.error)

  const intervalVal = validateInterval(payload.interval)
  if (!intervalVal.ok) throw new Error(intervalVal.error)

  const domVal = validateDayOfMonth(payload.dayOfMonth)
  if (!domVal.ok) throw new Error(domVal.error)

  await assertTemplateOwnership(id, userId)
  await assertSubcategoryOwnership(payload.subcategoryId, userId)

  await db
    .update(recurringTemplates)
    .set({
      amount: payload.amount.trim(),
      subcategoryId: payload.subcategoryId,
      interval: payload.interval as Interval,
      dayOfMonth: parseInt(payload.dayOfMonth, 10),
    })
    .where(eq(recurringTemplates.id, id))

  revalidatePath('/recurring')
}

export async function deleteRecurringTemplate(id: string) {
  const userId = await requireSession()
  await assertTemplateOwnership(id, userId)

  await db.delete(recurringTemplates).where(eq(recurringTemplates.id, id))

  revalidatePath('/recurring')
}

export async function listRecurringTemplates(): Promise<RecurringTemplateRow[]> {
  const userId = await requireSession()
  const today = new Date().toISOString().slice(0, 10)

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
    })
    .from(recurringTemplates)
    .innerJoin(subcategories, eq(recurringTemplates.subcategoryId, subcategories.id))
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(and(eq(recurringTemplates.userId, userId), eq(recurringTemplates.active, true)))

  return rows.map((r) => ({
    ...r,
    interval: r.interval as Interval,
    nextExecutionDate: nextExecutionDate(r as RecurringTemplate, today),
  }))
}

// ─── Renewal ─────────────────────────────────────────────────────────────────

/** TC-09-05: Confirm same value — extend by 12 months, no new template */
export async function confirmRenewal(id: string) {
  const userId = await requireSession()
  const tmpl = await assertTemplateOwnership(id, userId)

  await db
    .update(recurringTemplates)
    .set({ lastRenewedAt: renewalDueDate(tmpl) })
    .where(eq(recurringTemplates.id, id))

  revalidatePath('/dashboard')
}

/** TC-09-06/07/08: Update value — deprecate old, create successor */
export async function updateRenewal(id: string, newAmount: string) {
  const userId = await requireSession()

  const amountVal = validateAmount(newAmount)
  if (!amountVal.ok) throw new Error(amountVal.error)

  const tmpl = await assertTemplateOwnership(id, userId)
  const successor = buildSuccessor(tmpl, newAmount.trim())

  // Deactivate old template
  await db
    .update(recurringTemplates)
    .set({ active: false })
    .where(eq(recurringTemplates.id, id))

  // Insert successor (active by default)
  await db.insert(recurringTemplates).values({
    userId: successor.userId,
    subcategoryId: successor.subcategoryId,
    amount: successor.amount,
    startDate: successor.startDate,
    interval: successor.interval,
    dayOfMonth: successor.dayOfMonth,
    active: true,
    lastGeneratedDate: successor.lastGeneratedDate ?? undefined,
  })

  revalidatePath('/dashboard')
  revalidatePath('/recurring')
}

/** Active templates whose annual renewal is overdue — for the dashboard banner */
export async function getDueRenewals(): Promise<RecurringTemplateRow[]> {
  const userId = await requireSession()
  const today = new Date().toISOString().slice(0, 10)

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
    })
    .from(recurringTemplates)
    .innerJoin(subcategories, eq(recurringTemplates.subcategoryId, subcategories.id))
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(and(eq(recurringTemplates.userId, userId), eq(recurringTemplates.active, true)))

  return rows
    .filter((r) => isRenewalDue(r as RecurringTemplate, today))
    .map((r) => ({
      ...r,
      interval: r.interval as Interval,
      nextExecutionDate: nextExecutionDate(r as RecurringTemplate, today),
    }))
}
