import { db } from '@/lib/db'
import { recurringTemplateShares, people } from '@/lib/schema'
import { eq, and, asc } from 'drizzle-orm'
import type { ShareBps } from '@/lib/split'

/** The stored split of one template, oldest person first for rounding ties. */
export async function loadTemplateShares(templateId: string, userId: string): Promise<ShareBps[]> {
  const rows = await db
    .select({ personId: recurringTemplateShares.personId, shareBps: recurringTemplateShares.shareBps })
    .from(recurringTemplateShares)
    .innerJoin(people, eq(recurringTemplateShares.personId, people.id))
    .where(and(eq(recurringTemplateShares.templateId, templateId), eq(people.userId, userId)))
    .orderBy(asc(people.createdAt))

  return rows.map(({ personId, shareBps }) => ({ personId, bps: shareBps }))
}
