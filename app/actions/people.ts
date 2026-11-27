'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  people, expenses, expenseShares, recurringTemplates, recurringTemplateShares,
} from '@/lib/schema'
import { eq, and, sql } from 'drizzle-orm'
import { ensureSelfPerson } from '@/lib/people'
import { validatePersonName, parsePercentToBps, validateSplitTotal } from '@/lib/validations/people'
import { revalidatePath } from 'next/cache'
import { ActionError, guard, rejectDuplicate } from '@/lib/action-result'

const DUPLICATE_NAME_ERROR = 'A person with this name already exists'

async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) throw new ActionError('Unauthorized')
  return session.user.id
}

async function getOwnedPerson(id: string, userId: string) {
  const [person] = await db
    .select()
    .from(people)
    .where(and(eq(people.id, id), eq(people.userId, userId)))
  if (!person) throw new ActionError('Person not found')
  return person
}

async function assertNameAvailable(name: string, userId: string, ignoreId?: string) {
  const matches = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.userId, userId), sql`lower(${people.name}) = lower(${name})`))
  if (matches.some((m) => m.id !== ignoreId)) throw new ActionError(DUPLICATE_NAME_ERROR)
}

async function assertNotReferenced(personId: string, userId: string) {
  const [paid, shared, templatePaid, templateShared] = await Promise.all([
    db
      .select({ id: expenses.id })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.payerPersonId, personId))),
    db
      .select({ id: expenses.id })
      .from(expenseShares)
      .innerJoin(expenses, eq(expenseShares.expenseId, expenses.id))
      .where(and(eq(expenses.userId, userId), eq(expenseShares.personId, personId))),
    db
      .select({ id: recurringTemplates.id })
      .from(recurringTemplates)
      .where(and(eq(recurringTemplates.userId, userId), eq(recurringTemplates.payerPersonId, personId))),
    db
      .select({ id: recurringTemplates.id })
      .from(recurringTemplateShares)
      .innerJoin(recurringTemplates, eq(recurringTemplateShares.templateId, recurringTemplates.id))
      .where(and(eq(recurringTemplates.userId, userId), eq(recurringTemplateShares.personId, personId))),
  ])

  const count = (rows: { id: string }[], noun: string) => {
    const used = new Set(rows.map((r) => r.id)).size
    return used === 0 ? null : `${used} ${noun}${used === 1 ? '' : 's'}`
  }
  const uses = [
    count([...paid, ...shared], 'expense'),
    count([...templatePaid, ...templateShared], 'recurring expense'),
  ].filter(Boolean)

  if (uses.length > 0) {
    throw new ActionError(`This person is used in ${uses.join(' and ')}. Reassign them first.`)
  }
}

export async function createPerson(name: string) {
  return guard(async () => {
    const userId = await requireSession()

    const validation = validatePersonName(name)
    if (!validation.ok) throw new ActionError(validation.error)

    await ensureSelfPerson(userId)
    await assertNameAvailable(validation.value, userId)

    const [person] = await rejectDuplicate(
      db.insert(people).values({ userId, name: validation.value }).returning(),
      DUPLICATE_NAME_ERROR,
    )

    revalidatePath('/settings')
    return person
  })
}

export async function renamePerson(id: string, name: string) {
  return guard(async () => {
    const userId = await requireSession()

    const validation = validatePersonName(name)
    if (!validation.ok) throw new ActionError(validation.error)

    await getOwnedPerson(id, userId)
    await assertNameAvailable(validation.value, userId, id)

    await rejectDuplicate(
      db
        .update(people)
        .set({ name: validation.value })
        .where(and(eq(people.id, id), eq(people.userId, userId))),
      DUPLICATE_NAME_ERROR,
    )

    revalidatePath('/settings')
  })
}

export async function deletePerson(id: string) {
  return guard(async () => {
    const userId = await requireSession()

    const person = await getOwnedPerson(id, userId)
    if (person.isSelf) throw new ActionError('You cannot delete yourself')
    await assertNotReferenced(id, userId)

    const remove = db.delete(people).where(and(eq(people.id, id), eq(people.userId, userId)))

    if (person.defaultShareBps > 0) {
      // Hand the removed default share back to self so the total stays 100%.
      const self = await ensureSelfPerson(userId)
      const giveBack = db
        .update(people)
        .set({ defaultShareBps: self.defaultShareBps + person.defaultShareBps })
        .where(and(eq(people.id, self.id), eq(people.userId, userId)))
      await db.batch([remove, giveBack])
    } else {
      await db.batch([remove])
    }

    revalidatePath('/settings')
  })
}

export async function updateDefaultSplit(shares: { personId: string; percent: string }[]) {
  return guard(async () => {
    const userId = await requireSession()

    const parsed = shares.map(({ personId, percent }) => {
      const result = parsePercentToBps(percent)
      if (!result.ok) throw new ActionError(result.error)
      return { personId, bps: result.value }
    })

    const owned = await db.select({ id: people.id }).from(people).where(eq(people.userId, userId))
    const given = new Set(parsed.map((s) => s.personId))
    const coversEveryPerson =
      given.size === parsed.length && given.size === owned.length && owned.every((p) => given.has(p.id))
    if (!coversEveryPerson) throw new ActionError('Person not found')

    const total = validateSplitTotal(parsed.map((s) => s.bps))
    if (!total.ok) throw new ActionError(total.error)

    const [first, ...rest] = parsed.map(({ personId, bps }) =>
      db
        .update(people)
        .set({ defaultShareBps: bps })
        .where(and(eq(people.id, personId), eq(people.userId, userId))),
    )
    await db.batch([first, ...rest])

    revalidatePath('/settings')
  })
}
