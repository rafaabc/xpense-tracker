import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMonthlyBalance } from '@/app/actions/balance'
import { getUserCurrency } from '@/app/actions/summaries'
import { runCatchUp } from '@/lib/recurrence-engine'
import BalanceView from '@/components/balance/BalanceView'

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const params = await searchParams
  // A hand-edited month falls back to the current one
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? '') ? params.month! : currentYearMonth()

  // Lazy catch-up: overdue recurring expenses must count in the balance
  await runCatchUp(session.user.id, new Date().toISOString().slice(0, 10))

  const [currency, { balances, transfers }] = await Promise.all([
    getUserCurrency(),
    getMonthlyBalance(month),
  ])

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
          Balance
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-md)',
            color: 'var(--ink-500)',
            margin: 0,
          }}
        >
          Who owes whom for shared expenses, month by month.
        </p>
      </div>

      <BalanceView month={month} currency={currency} balances={balances} transfers={transfers} />
    </div>
  )
}
