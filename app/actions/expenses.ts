'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { expenses, subcategories, groups } from '@/lib/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { validateAmount, validateExpenseDate } from '@/lib/validations/expenses'
import { revalidatePath } from 'next/cache'
import type { ExpenseRow } from '@/lib/types'

async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

async function assertExpenseOwnership(id: string, userId: string) {
  const [expense] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
  if (!expense) throw new Error('Expense not found')
}

async function assertSubcategoryOwnership(subcategoryId: string, userId: string) {
  const [sub] = await db
    .select({ id: subcategories.id })
    .from(subcategories)
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(and(eq(subcategories.id, subcategoryId), eq(groups.userId, userId)))
  if (!sub) throw new Error('Subcategory not found')
}

interface ExpensePayload {
  amount: string
  subcategoryId: string
  date: string
}

export async function createExpense({ amount, subcategoryId, date }: ExpensePayload) {
  const userId = await requireSession()

  const amountVal = validateAmount(amount)
  if (!amountVal.ok) throw new Error(amountVal.error)

  const dateVal = validateExpenseDate(date)
  if (!dateVal.ok) throw new Error(dateVal.error)

  await assertSubcategoryOwnership(subcategoryId, userId)

  const [expense] = await db
    .insert(expenses)
    .values({ userId, subcategoryId, amount: amount.trim(), date })
    .returning()

  revalidatePath('/expenses')
  return expense
}

export async function updateExpense(id: string, { amount, subcategoryId, date }: ExpensePayload) {
  const userId = await requireSession()

  const amountVal = validateAmount(amount)
  if (!amountVal.ok) throw new Error(amountVal.error)

  const dateVal = validateExpenseDate(date)
  if (!dateVal.ok) throw new Error(dateVal.error)

  await assertExpenseOwnership(id, userId)

  await db
    .update(expenses)
    .set({ amount: amount.trim(), subcategoryId, date })
    .where(eq(expenses.id, id))

  revalidatePath('/expenses')
}

export async function deleteExpense(id: string) {
  const userId = await requireSession()
  await assertExpenseOwnership(id, userId)

  await db.delete(expenses).where(eq(expenses.id, id))

  revalidatePath('/expenses')
}

export interface ExpenseFilters {
  from?: string
  to?: string
  group?: string
  subcategory?: string
}

export async function listExpenses(filters: ExpenseFilters): Promise<ExpenseRow[]> {
  const userId = await requireSession()

  const conditions = [
    eq(groups.userId, userId),
    ...(filters.from ? [gte(expenses.date, filters.from)] : []),
    ...(filters.to ? [lte(expenses.date, filters.to)] : []),
    ...(filters.group ? [eq(groups.id, filters.group)] : []),
    ...(filters.subcategory ? [eq(subcategories.id, filters.subcategory)] : []),
  ]

  const rows = await db
    .select({
      id: expenses.id,
      amount: expenses.amount,
      date: expenses.date,
      subcategoryId: subcategories.id,
      subcategoryName: subcategories.name,
      groupId: groups.id,
      groupName: groups.name,
    })
    .from(expenses)
    .innerJoin(subcategories, eq(expenses.subcategoryId, subcategories.id))
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(and(...conditions))
    .orderBy(desc(expenses.date))

  return rows
}
