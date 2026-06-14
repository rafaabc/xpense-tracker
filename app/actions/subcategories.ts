'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { subcategories, groups } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { validateSubcategoryName, validateParentGroupId } from '@/lib/validations/subcategories'
import { revalidatePath } from 'next/cache'

async function requireSession() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

async function assertGroupOwnership(groupId: string, userId: string) {
  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.userId, userId)))
  if (!group) throw new Error('Group not found')
}

export async function createSubcategory(name: string, groupId: string) {
  const userId = await requireSession()

  const nameVal = validateSubcategoryName(name)
  if (!nameVal.ok) throw new Error(nameVal.error)

  const parentVal = validateParentGroupId(groupId)
  if (!parentVal.ok) throw new Error(parentVal.error)

  await assertGroupOwnership(groupId, userId)

  const [sub] = await db
    .insert(subcategories)
    .values({ groupId, name: name.trim() })
    .returning()

  revalidatePath('/categories')
  return sub
}

export async function renameSubcategory(id: string, name: string) {
  const userId = await requireSession()

  const validation = validateSubcategoryName(name)
  if (!validation.ok) throw new Error(validation.error)

  // Cross-tenant: join through groups to verify ownership
  const [sub] = await db
    .select({ id: subcategories.id })
    .from(subcategories)
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(and(eq(subcategories.id, id), eq(groups.userId, userId)))

  if (!sub) throw new Error('Subcategory not found')

  await db
    .update(subcategories)
    .set({ name: name.trim() })
    .where(eq(subcategories.id, id))

  revalidatePath('/categories')
}

export async function deleteSubcategory(id: string) {
  const userId = await requireSession()

  // Cross-tenant: verify ownership via parent group
  const [sub] = await db
    .select({ id: subcategories.id })
    .from(subcategories)
    .innerJoin(groups, eq(subcategories.groupId, groups.id))
    .where(and(eq(subcategories.id, id), eq(groups.userId, userId)))

  if (!sub) throw new Error('Subcategory not found')

  await db.delete(subcategories).where(eq(subcategories.id, id))

  revalidatePath('/categories')
}
