import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import CurrencySelector from '@/components/currency/CurrencySelector'
import { DEFAULT_CURRENCY, type Currency } from '@/lib/validations/currency'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const [user] = await db
    .select({ currency: users.currency })
    .from(users)
    .where(eq(users.id, session.user.id))

  const currency = (user?.currency ?? DEFAULT_CURRENCY) as Currency

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 600 }}>
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
          Settings
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-md)',
            color: 'var(--ink-500)',
            margin: 0,
          }}
        >
          Manage your account preferences.
        </p>
      </div>

      <section
        style={{
          background: 'var(--white)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 'var(--text-lg)',
            color: 'var(--ink-900)',
            margin: '0 0 20px',
          }}
        >
          Currency
        </h2>
        <CurrencySelector current={currency} />
      </section>
    </div>
  )
}
