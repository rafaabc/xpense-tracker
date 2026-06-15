import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { runCatchUp } from '@/lib/recurrence-engine'
import { getDueRenewals } from '@/app/actions/recurring'
import RenewalBanner from '@/components/RenewalBanner'
import type { Currency } from '@/lib/validations/currency'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const userId = session.user.id
  const today = new Date().toISOString().slice(0, 10)

  // Lazy catch-up: generate any overdue recurring expenses for this user (TC-08-03)
  await runCatchUp(userId, today)

  const [dueRenewals, [userRecord]] = await Promise.all([
    getDueRenewals(),
    db.select({ currency: users.currency }).from(users).where(eq(users.id, userId)),
  ])

  const currency = (userRecord?.currency ?? 'DKK') as Currency

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
          Dashboard
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-md)',
            color: 'var(--ink-500)',
            margin: 0,
          }}
        >
          Welcome, {session.user?.name ?? 'there'}.
        </p>
      </div>

      {/* Annual renewal banners (TC-09-01/02/03/04) */}
      {dueRenewals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dueRenewals.map((tmpl) => (
            <RenewalBanner key={tmpl.id} template={tmpl} currency={currency} />
          ))}
        </div>
      )}
    </div>
  )
}
