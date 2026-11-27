'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { expenses, expenseShares } from '@/lib/schema'
import { eq, and, sql } from 'drizzle-orm'
import { ensureSelfPerson, listPeople } from '@/lib/people'
import { calcBalances, calcTransfers } from '@/lib/settlement'

export async function getMonthlyBalance(yearMonth: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = session.user.id

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error('Invalid month')

  await ensureSelfPerson(userId)

  const inMonth = and(
    eq(expenses.userId, userId),
    sql`to_char(${expenses.date}::date, 'YYYY-MM') = ${yearMonth}`,
  )

  const [people, rows, shares] = await Promise.all([
    listPeople(userId),
    db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        payerPersonId: expenses.payerPersonId,
        splitMode: expenses.splitMode,
      })
      .from(expenses)
      .where(inMonth),
    db
      .select({
        expenseId: expenseShares.expenseId,
        personId: expenseShares.personId,
        amount: expenseShares.amount,
      })
      .from(expenseShares)
      .innerJoin(expenses, eq(expenseShares.expenseId, expenses.id))
      .where(inMonth),
  ])

  const balances = calcBalances(
    people,
    rows.map((row) => ({ ...row, shares: shares.filter((s) => s.expenseId === row.id) })),
  )

  return {
    balances: balances.map((balance) => {
      const person = people.find((p) => p.id === balance.personId)!
      const { personId, ...totals } = balance
      return { personId, name: person.name, isSelf: person.isSelf, ...totals }
    }),
    transfers: calcTransfers(balances),
  }
}
