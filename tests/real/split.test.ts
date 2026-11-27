import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  users, groups, subcategories, people, expenses, expenseShares, recurringTemplates,
} from '@/lib/schema'
import { createExpense } from '@/app/actions/expenses'
import { createGroup, renameGroup, deleteGroup } from '@/app/actions/groups'
import { createSubcategory, renameSubcategory } from '@/app/actions/subcategories'
import { createPerson, renamePerson } from '@/app/actions/people'
import { unwrap } from '@/lib/action-result'
import { getMonthlyBalance } from '@/app/actions/balance'
import { createRecurringTemplate, updateRecurringTemplate } from '@/app/actions/recurring'
import { runCatchUp } from '@/lib/recurrence-engine'

// Only the session and the Next.js cache are replaced; every query hits Neon.
const session = vi.hoisted(() => ({ userId: '' }))
vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: session.userId } }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const today = new Date().toISOString().slice(0, 10)
const month = today.slice(0, 7)

let userId: string
let selfId: string
let anaId: string
let groupId: string
let subcategoryId: string

beforeEach(async () => {
  userId = session.userId = crypto.randomUUID()
  selfId = crypto.randomUUID()
  anaId = crypto.randomUUID()
  groupId = crypto.randomUUID()
  subcategoryId = crypto.randomUUID()
  await db.batch([
    db.insert(users).values({ id: userId, name: 'Real test', email: `${userId}@real.invalid` }),
    db.insert(people).values([
      { id: selfId, userId, name: 'Me', isSelf: true, defaultShareBps: 5000 },
      { id: anaId, userId, name: 'Ana', defaultShareBps: 5000 },
    ]),
    db.insert(groups).values({ id: groupId, userId, name: 'Home' }),
    db.insert(subcategories).values({ id: subcategoryId, groupId, name: 'Rent' }),
  ])
})

// Also proves that deleting a user cascades through people, expenses and shares
afterEach(async () => {
  await db.delete(users).where(eq(users.id, userId))
})

const split = () => ({
  payerPersonId: anaId,
  splitMode: 'split' as const,
  shares: [{ personId: selfId, percent: '60' }, { personId: anaId, percent: '40' }],
})
const addExpense = async () =>
  unwrap(await createExpense({ amount: '100.01', subcategoryId, date: today, ...split() }))
const sharesOf = (expenseId: string) =>
  db.select().from(expenseShares).where(eq(expenseShares.expenseId, expenseId))
const myExpenses = () => db.select().from(expenses).where(eq(expenses.userId, userId))

describe('split expenses on the real database', () => {
  it('TC-16-08: the database refuses to delete a referenced person', async () => {
    await addExpense()
    await expect(db.delete(people).where(eq(people.id, anaId))).rejects.toThrow()
  })

  it('returns a readable error for every duplicate name', async () => {
    const group = { error: 'A group with this name already exists' }
    const sub = { error: 'A subcategory with this name already exists' }
    const person = { error: 'A person with this name already exists' }

    expect(await createGroup('HOME')).toEqual(group)
    const other = unwrap(await createGroup('Food'))
    expect(await renameGroup(other.id, 'home')).toEqual(group)

    expect(await createSubcategory('RENT', groupId)).toEqual(sub)
    const water = unwrap(await createSubcategory('Water', groupId))
    expect(await renameSubcategory(water.id, 'rent')).toEqual(sub)

    expect(await createPerson('ana')).toEqual(person)
    expect(await renamePerson(anaId, 'ME')).toEqual(person)
  })

  it('TC-19-07: a failing share write leaves no expense behind', async () => {
    const id = crypto.randomUUID()
    await expect(
      db.batch([
        db.insert(expenses).values({ id, userId, subcategoryId, amount: '10.00', date: today }),
        db.insert(expenseShares).values({ expenseId: id, personId: 'missing', shareBps: 10000, amount: '10.00' }),
      ]),
    ).rejects.toThrow()
    expect(await myExpenses()).toEqual([])
  })

  it('TC-19-08: deleting a group cascades into the shares', async () => {
    const expense = await addExpense()
    expect(await sharesOf(expense.id)).toHaveLength(2)
    await deleteGroup(groupId)
    expect(await sharesOf(expense.id)).toEqual([])
  })

  it('TC-20-04: the balance reads only the selected month', async () => {
    await addExpense()
    await createExpense({ amount: '500.00', subcategoryId, date: '2020-01-31', ...split() })
    const { transfers } = await getMonthlyBalance(month)
    expect(transfers).toEqual([{ from: selfId, to: anaId, amount: '60.01' }])
  })

  it('TC-21-01 / TC-21-05: generates split expenses and applies a change to this month', async () => {
    const template = unwrap(await createRecurringTemplate({
      amount: '100.00', subcategoryId, startDate: `${month}-01`, interval: 'monthly', dayOfMonth: '1', ...split(),
    }))
    await runCatchUp(userId, today)
    await runCatchUp(userId, today)

    const generated = await myExpenses()
    expect(generated).toHaveLength(1)
    expect(generated[0]).toMatchObject({ recurringTemplateId: template.id, payerPersonId: anaId, splitMode: 'split' })

    await updateRecurringTemplate(
      template.id,
      {
        amount: '100.00', subcategoryId, startDate: `${month}-01`, interval: 'monthly', dayOfMonth: '1',
        payerPersonId: selfId, splitMode: 'split',
        shares: [{ personId: selfId, percent: '25' }, { personId: anaId, percent: '75' }],
      },
      { applyToCurrentMonth: true },
    )
    expect((await myExpenses())[0].payerPersonId).toBe(selfId)
    const amounts = (await sharesOf(generated[0].id)).map((s) => s.amount).sort()
    expect(amounts).toEqual(['25.00', '75.00'])
  })

  it('TC-21-07: the backfill links only on-schedule expenses of the same amount', async () => {
    const templateId = crypto.randomUUID()
    await db.insert(recurringTemplates).values({
      id: templateId, userId, subcategoryId, amount: '50.00', startDate: '2024-01-15',
      interval: 'monthly', dayOfMonth: 15,
    })
    const ids = { match: crypto.randomUUID(), offSchedule: crypto.randomUUID(), otherAmount: crypto.randomUUID() }
    await db.insert(expenses).values([
      { id: ids.match, userId, subcategoryId, amount: '50.00', date: '2024-02-15' },
      { id: ids.offSchedule, userId, subcategoryId, amount: '50.00', date: '2024-02-16' },
      { id: ids.otherAmount, userId, subcategoryId, amount: '51.00', date: '2024-03-15' },
    ])

    execFileSync(process.execPath, ['--use-system-ca', 'scripts/backfill-self-person.mjs'], { stdio: 'ignore' })

    const rows = await db.select().from(expenses).where(inArray(expenses.id, Object.values(ids)))
    const link = (id: string) => rows.find((r) => r.id === id)?.recurringTemplateId
    expect(link(ids.match)).toBe(templateId)
    expect(link(ids.offSchedule)).toBeNull()
    expect(link(ids.otherAmount)).toBeNull()
    expect(rows.every((r) => r.payerPersonId === selfId)).toBe(true)
  })
})
