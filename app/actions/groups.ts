'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { groups } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { validateGroupName } from '@/lib/validations/groups'
import { revalidatePath } from 'next/cache'
import { ActionError, guard, rejectDuplicate } from '@/lib/action-result'

const DUPLICATE_NAME_ERROR = 'A group with this name already exists'

async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) throw new ActionError('Unauthorized')
  return session.user.id
}

export async function createGroup(name: string) {
  return guard(async () => {
    const userId = await requireSession()

    const validation = validateGroupName(name)
    if (!validation.ok) throw new ActionError(validation.error)

    const [group] = await rejectDuplicate(
      db
        .insert(groups)
        .values({ userId, name: name.trim() })
        .returning(),
      DUPLICATE_NAME_ERROR,
    )

    revalidatePath('/categories')
    return group
  })
}

export async function renameGroup(id: string, name: string) {
  return guard(async () => {
    const userId = await requireSession()

    const validation = validateGroupName(name)
    if (!validation.ok) throw new ActionError(validation.error)

    await rejectDuplicate(
      db
        .update(groups)
        .set({ name: name.trim() })
        .where(and(eq(groups.id, id), eq(groups.userId, userId))),
      DUPLICATE_NAME_ERROR,
    )

    revalidatePath('/categories')
  })
}

export async function deleteGroup(id: string) {
  return guard(async () => {
    const userId = await requireSession()

    await db
      .delete(groups)
      .where(and(eq(groups.id, id), eq(groups.userId, userId)))

    revalidatePath('/categories')
  })
}
