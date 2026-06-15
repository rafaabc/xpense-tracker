'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { expenses, subcategories, groups, users } from '@/lib/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { MonthlyRow, AnnualRow } from '@/lib/summaries'
import type { Currency } from '@/lib/validations/currency'

async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export async function getMonthlyRows(yearMonth: string): Promise<MonthlyRow[]> {
  const userId = await requireSession()
  // yearMonth = "YYYY-MM"
  const rows = await db
    .select({
      groupId: groups.id,
      groupName: groups.name,
      amount: expenses.amount,
    })
    .from(expenses)
    .innerJoin(subcategories, eq(expenses.subcategoryId, subcategories.id))
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(
      and(
        eq(expenses.userId, userId),
        sql`to_char(${expenses.date}::date, 'YYYY-MM') = ${yearMonth}`
      )
    )

  return rows
}

export async function getAnnualRows(year: number): Promise<AnnualRow[]> {
  const userId = await requireSession()

  const rows = await db
    .select({
      groupId: groups.id,
      groupName: groups.name,
      month: sql<number>`extract(month from ${expenses.date}::date)::int`,
      amount: expenses.amount,
    })
    .from(expenses)
    .innerJoin(subcategories, eq(expenses.subcategoryId, subcategories.id))
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(
      and(
        eq(expenses.userId, userId),
        sql`extract(year from ${expenses.date}::date) = ${year}`
      )
    )

  return rows
}

export async function getAvailableYears(): Promise<number[]> {
  const userId = await requireSession()

  const yearExpr = sql<number>`extract(year from ${expenses.date}::date)::int`
  const rows = await db
    .select({ year: yearExpr })
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .groupBy(yearExpr)
    .orderBy(sql`1 desc`)

  return rows.map((r) => r.year)
}

export async function getUserCurrency(): Promise<Currency> {
  const userId = await requireSession()
  const [row] = await db
    .select({ currency: users.currency })
    .from(users)
    .where(eq(users.id, userId))
  return (row?.currency ?? 'DKK') as Currency
}
