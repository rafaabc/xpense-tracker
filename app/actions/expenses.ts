'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { expenses, expenseShares, subcategories, groups } from '@/lib/schema'
import { eq, and, gte, lte, desc, inArray, sql } from 'drizzle-orm'
import { validateAmount, validateExpenseDate } from '@/lib/validations/expenses'
import { parseSplit, resolveShares, type SplitPayload } from '@/lib/split-input'
import { allocateShares, type ShareBps } from '@/lib/split'
import { revalidatePath } from 'next/cache'
import { EXPENSES_PAGE_SIZE, type ExpenseRow } from '@/lib/types'
import { ActionError, guard } from '@/lib/action-result'

async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) throw new ActionError('Unauthorized')
  return session.user.id
}

async function assertExpenseOwnership(id: string, userId: string) {
  const [expense] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
  if (!expense) throw new ActionError('Expense not found')
}

async function assertSubcategoryOwnership(subcategoryId: string, userId: string) {
  const [sub] = await db
    .select({ id: subcategories.id })
    .from(subcategories)
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(and(eq(subcategories.id, subcategoryId), eq(groups.userId, userId)))
  if (!sub) throw new ActionError('Subcategory not found')
}

interface ExpensePayload extends SplitPayload {
  amount: string
  subcategoryId: string
  date: string
}

/** Validates everything that needs no database access. */
function validatePayload(payload: ExpensePayload) {
  const amountVal = validateAmount(payload.amount)
  if (!amountVal.ok) throw new ActionError(amountVal.error)

  const dateVal = validateExpenseDate(payload.date)
  if (!dateVal.ok) throw new ActionError(dateVal.error)

  return { amount: amountVal.value, shares: parseSplit(payload) }
}

/** Checks ownership of the people and returns the share rows to store. */
async function buildShareRows(
  expenseId: string,
  amount: string,
  payerPersonId: string,
  shares: ShareBps[],
  userId: string,
) {
  const owned = await resolveShares(payerPersonId, shares, userId)

  return allocateShares(amount, owned, payerPersonId).map((s) => ({
    expenseId,
    personId: s.personId,
    shareBps: s.bps,
    amount: s.amount,
  }))
}

export async function createExpense(payload: ExpensePayload) {
  return guard(async () => {
    const userId = await requireSession()
    const { amount, shares } = validatePayload(payload)
    const { subcategoryId, date, payerPersonId, splitMode } = payload

    await assertSubcategoryOwnership(subcategoryId, userId)

    // The id is generated here so the shares can be written in the same batch
    const id = crypto.randomUUID()
    const shareRows = await buildShareRows(id, amount, payerPersonId, shares, userId)

    const insertExpense = db
      .insert(expenses)
      .values({ id, userId, subcategoryId, amount, date, payerPersonId, splitMode })
      .returning()

    // neon-http has no interactive transactions; a batch is applied atomically
    const [[expense]] = await db.batch([
      insertExpense,
      ...(shareRows.length ? [db.insert(expenseShares).values(shareRows)] : []),
    ])

    revalidatePath('/expenses')
    return expense
  })
}

export async function updateExpense(id: string, payload: ExpensePayload) {
  return guard(async () => {
    const userId = await requireSession()
    const { amount, shares } = validatePayload(payload)
    const { subcategoryId, date, payerPersonId, splitMode } = payload

    await assertExpenseOwnership(id, userId)
    await assertSubcategoryOwnership(subcategoryId, userId)
    const shareRows = await buildShareRows(id, amount, payerPersonId, shares, userId)

    await db.batch([
      db
        .update(expenses)
        .set({ amount, subcategoryId, date, payerPersonId, splitMode })
        .where(and(eq(expenses.id, id), eq(expenses.userId, userId))),
      db.delete(expenseShares).where(eq(expenseShares.expenseId, id)),
      ...(shareRows.length ? [db.insert(expenseShares).values(shareRows)] : []),
    ])

    revalidatePath('/expenses')
  })
}

export async function deleteExpense(id: string) {
  return guard(async () => {
    const userId = await requireSession()
    await assertExpenseOwnership(id, userId)

    await db.delete(expenses).where(eq(expenses.id, id))

    revalidatePath('/expenses')
  })
}

export interface ExpenseFilters {
  from?: string
  to?: string
  group?: string
  subcategory?: string
}

// Page size constant lives in lib/types.ts (use-server files can only export async functions)

export async function listExpenses(
  filters: ExpenseFilters,
  page = 1,
): Promise<{ rows: ExpenseRow[]; total: number }> {
  const userId = await requireSession()

  const conditions = [
    eq(groups.userId, userId),
    ...(filters.from ? [gte(expenses.date, filters.from)] : []),
    ...(filters.to ? [lte(expenses.date, filters.to)] : []),
    ...(filters.group ? [eq(groups.id, filters.group)] : []),
    ...(filters.subcategory ? [eq(subcategories.id, filters.subcategory)] : []),
  ]

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        date: expenses.date,
        subcategoryId: subcategories.id,
        subcategoryName: subcategories.name,
        groupId: groups.id,
        groupName: groups.name,
        payerPersonId: expenses.payerPersonId,
        splitMode: expenses.splitMode,
      })
      .from(expenses)
      .innerJoin(subcategories, eq(expenses.subcategoryId, subcategories.id))
      .innerJoin(groups, eq(subcategories.groupId, groups.id))
      .where(and(...conditions))
      .orderBy(desc(expenses.date))
      .limit(EXPENSES_PAGE_SIZE)
      .offset((page - 1) * EXPENSES_PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .innerJoin(subcategories, eq(expenses.subcategoryId, subcategories.id))
      .innerJoin(groups, eq(subcategories.groupId, groups.id))
      .where(and(...conditions)),
  ])

  const splitIds = rows.filter((r) => r.splitMode === 'split').map((r) => r.id)
  // splitIds come from the user-scoped query above
  const shares = splitIds.length
    ? await db
        .select({
          expenseId: expenseShares.expenseId,
          personId: expenseShares.personId,
          shareBps: expenseShares.shareBps,
        })
        .from(expenseShares)
        .where(inArray(expenseShares.expenseId, splitIds))
    : []

  return {
    rows: rows.map((row) => ({
      ...row,
      shares: shares
        .filter((s) => s.expenseId === row.id)
        .map(({ personId, shareBps }) => ({ personId, shareBps })),
    })),
    total: count ?? 0,
  }
}
