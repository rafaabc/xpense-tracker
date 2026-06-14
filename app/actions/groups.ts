'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { groups } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { validateGroupName } from '@/lib/validations/groups'
import { revalidatePath } from 'next/cache'

async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export async function createGroup(name: string) {
  const userId = await requireSession()

  const validation = validateGroupName(name)
  if (!validation.ok) throw new Error(validation.error)

  const [group] = await db
    .insert(groups)
    .values({ userId, name: name.trim() })
    .returning()

  revalidatePath('/categories')
  return group
}

export async function renameGroup(id: string, name: string) {
  const userId = await requireSession()

  const validation = validateGroupName(name)
  if (!validation.ok) throw new Error(validation.error)

  await db
    .update(groups)
    .set({ name: name.trim() })
    .where(and(eq(groups.id, id), eq(groups.userId, userId)))

  revalidatePath('/categories')
}

export async function deleteGroup(id: string) {
  const userId = await requireSession()

  await db
    .delete(groups)
    .where(and(eq(groups.id, id), eq(groups.userId, userId)))

  revalidatePath('/categories')
}
