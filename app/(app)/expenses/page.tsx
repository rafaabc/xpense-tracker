import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { groups, subcategories, users } from '@/lib/schema'
import { eq, inArray } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { listExpenses } from '@/app/actions/expenses'
import ExpensesManager from '@/components/expenses/ExpensesManager'
import { DEFAULT_CURRENCY, type Currency } from '@/lib/validations/currency'

interface SearchParams {
  from?: string
  to?: string
  group?: string
  subcategory?: string
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const userId = session.user.id
  const filters = await searchParams

  // Fetch expenses, groups, currency in parallel
  const [expenses, userGroups, [userRecord]] = await Promise.all([
    listExpenses(filters),
    db
      .select({ id: groups.id, name: groups.name })
      .from(groups)
      .where(eq(groups.userId, userId))
      .orderBy(groups.createdAt),
    db
      .select({ currency: users.currency })
      .from(users)
      .where(eq(users.id, userId)),
  ])

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

  const currency = (userRecord?.currency ?? DEFAULT_CURRENCY) as Currency

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 860 }}>
      {/* Page header */}
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
          Expenses
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-md)',
            color: 'var(--ink-500)',
            margin: 0,
          }}
        >
          Track and manage your spending history.
        </p>
      </div>

      {/* Filter bar */}
      <form
        method="GET"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            htmlFor="filter-from"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--ink-500)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            From
          </label>
          <input
            id="filter-from"
            name="from"
            type="date"
            defaultValue={filters.from ?? ''}
            style={{
              height: 38,
              padding: '0 10px',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-900)',
              background: 'var(--white)',
              border: '1.5px solid var(--border-strong, #DAD6CC)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            htmlFor="filter-to"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--ink-500)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            To
          </label>
          <input
            id="filter-to"
            name="to"
            type="date"
            defaultValue={filters.to ?? ''}
            style={{
              height: 38,
              padding: '0 10px',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-900)',
              background: 'var(--white)',
              border: '1.5px solid var(--border-strong, #DAD6CC)',
              borderRadius: 'var(--radius-md)',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            htmlFor="filter-group"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--ink-500)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Group
          </label>
          <select
            id="filter-group"
            name="group"
            defaultValue={filters.group ?? ''}
            style={{
              height: 38,
              padding: '0 10px',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-900)',
              background: 'var(--white)',
              border: '1.5px solid var(--border-strong, #DAD6CC)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <option value="">All groups</option>
            {userGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            htmlFor="filter-subcategory"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--ink-500)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Subcategory
          </label>
          <select
            id="filter-subcategory"
            name="subcategory"
            defaultValue={filters.subcategory ?? ''}
            style={{
              height: 38,
              padding: '0 10px',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-900)',
              background: 'var(--white)',
              border: '1.5px solid var(--border-strong, #DAD6CC)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <option value="">All subcategories</option>
            {groupsWithSubs.map((g) =>
              g.subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>{g.name} — {sub.name}</option>
              ))
            )}
          </select>
        </div>

        <button
          type="submit"
          style={{
            height: 38,
            padding: '0 16px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--border-strong, #DAD6CC)',
            background: 'var(--white)',
            color: 'var(--ink-700)',
            cursor: 'pointer',
          }}
        >
          Filter
        </button>

        {(filters.from || filters.to || filters.group || filters.subcategory) && (
          <a
            href="/expenses"
            style={{
              height: 38,
              padding: '0 16px',
              display: 'inline-flex',
              alignItems: 'center',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-500)',
              textDecoration: 'none',
            }}
          >
            Clear
          </a>
        )}
      </form>

      <ExpensesManager
        expenses={expenses}
        groups={groupsWithSubs}
        currency={currency}
      />
    </div>
  )
}
