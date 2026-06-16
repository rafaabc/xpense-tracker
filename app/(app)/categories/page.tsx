import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { groups, subcategories } from '@/lib/schema'
import { eq, inArray } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import CategoriesManager from '@/components/categories/CategoriesManager'

export default async function CategoriesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const userId = session.user.id

  const userGroups = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(eq(groups.userId, userId))
    .orderBy(groups.createdAt)

  const groupIds = userGroups.map((g) => g.id)

  const userSubcategories = groupIds.length
    ? await db
        .select({ id: subcategories.id, name: subcategories.name, groupId: subcategories.groupId })
        .from(subcategories)
        .where(inArray(subcategories.groupId, groupIds))
        .orderBy(subcategories.createdAt)
    : []

  const subsByGroup = new Map<string, { id: string; name: string }[]>()
  for (const sub of userSubcategories) {
    const list = subsByGroup.get(sub.groupId) ?? []
    list.push({ id: sub.id, name: sub.name })
    subsByGroup.set(sub.groupId, list)
  }

  const groupsWithSubs = userGroups.map((g) => ({
    ...g,
    subcategories: subsByGroup.get(g.id) ?? [],
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 680 }}>
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 'var(--text-2xl)',
            color: 'var(--ink-900)',
            margin: '0 0 6px',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          Categories
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-md)',
            color: 'var(--ink-500)',
            margin: 0,
          }}
        >
          Organise your expenses into groups and subcategories.
        </p>
      </div>

      <CategoriesManager groups={groupsWithSubs} />
    </div>
  )
}
