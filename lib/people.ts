import { db } from '@/lib/db'
import { people, users } from '@/lib/schema'
import { eq, and, asc, desc } from 'drizzle-orm'
import { FULL_SHARE_BPS } from '@/lib/validations/people'

const SELF_FALLBACK_NAME = 'You'

function selectSelf(userId: string) {
  return db
    .select()
    .from(people)
    .where(and(eq(people.userId, userId), eq(people.isSelf, true)))
}

/** The user's people, the user first, then oldest first. */
export function listPeople(userId: string) {
  return db
    .select({
      id: people.id,
      name: people.name,
      isSelf: people.isSelf,
      defaultShareBps: people.defaultShareBps,
    })
    .from(people)
    .where(eq(people.userId, userId))
    .orderBy(desc(people.isSelf), asc(people.createdAt))
}

/**
 * Returns the person representing the logged-in user, creating it on first use.
 * Not a Server Action on purpose: it trusts `userId`, so callers must pass the
 * session user id. Safe to call during RSC render (no revalidation).
 */
export async function ensureSelfPerson(userId: string) {
  const [existing] = await selectSelf(userId)
  if (existing) return existing

  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId))

  // A concurrent request may win the insert; the unique index keeps one self row.
  await db
    .insert(people)
    .values({
      userId,
      name: user?.name?.trim() || SELF_FALLBACK_NAME,
      isSelf: true,
      defaultShareBps: FULL_SHARE_BPS,
    })
    .onConflictDoNothing()

  const [created] = await selectSelf(userId)
  return created
}
