'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatAmount } from '@/lib/format'
import type { Currency } from '@/lib/validations/currency'
import type { PersonBalance, Transfer } from '@/lib/settlement'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function monthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split('-')
  return `${MONTHS[Number(month) - 1]} ${year}`
}

/** The last 24 months, newest first, plus the selected one if it is older. */
function monthOptions(selected: string) {
  const now = new Date()
  const values = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  return values.includes(selected) ? values : [...values, selected]
}

interface Props {
  month: string
  currency: Currency
  balances: (PersonBalance & { name: string; isSelf: boolean })[]
  transfers: Transfer[]
}

const cardStyle = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-soft)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  padding: 'var(--space-6)',
} as const

const listStyle = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' } as const

const textStyle = { fontFamily: 'var(--font-sans)', fontSize: 'var(--text-md)', color: 'var(--ink-900)' } as const

const mutedStyle = { ...textStyle, fontSize: 'var(--text-sm)', color: 'var(--ink-500)' } as const

const moneyStyle = {
  fontFamily: 'var(--font-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 600,
  whiteSpace: 'nowrap',
} as const

export default function BalanceView({ month, currency, balances, transfers }: Props) {
  const router = useRouter()
  const money = (value: string) => <span style={moneyStyle}>{formatAmount(value, currency)}</span>

  function describe({ from, to }: Transfer) {
    const find = (id: string) => balances.find((b) => b.personId === id)!
    const payer = find(from)
    const receiver = find(to)
    if (payer.isSelf) return `You pay ${receiver.name}`
    return `${payer.name} pays ${receiver.isSelf ? 'you' : receiver.name}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label htmlFor="balance-month" style={{ ...mutedStyle, fontWeight: 600 }}>Month</label>
        <select
          id="balance-month"
          value={month}
          onChange={(e) => router.push(`/balance?month=${e.target.value}`)}
          style={{
            height: 44,
            padding: '0 12px',
            ...textStyle,
            fontSize: 'var(--text-sm)',
            background: 'var(--surface-card)',
            border: '1.5px solid var(--border-strong, #DAD6CC)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          {monthOptions(month).map((value) => (
            <option key={value} value={value}>{monthLabel(value)}</option>
          ))}
        </select>
      </div>

      {balances.length < 2 ? (
        <div style={cardStyle}>
          <p style={{ ...textStyle, margin: 0 }}>
            There is no one to share expenses with yet.{' '}
            <Link href="/settings" style={{ color: 'var(--brand)', fontWeight: 600 }}>
              Add people in Settings
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div style={cardStyle}>
            {transfers.length === 0 ? (
              <p style={{ ...textStyle, margin: 0 }}>All settled for this month</p>
            ) : (
              <ul aria-label="Transfers" style={{ ...listStyle, gap: 12 }}>
                {transfers.map((transfer) => (
                  <li
                    key={`${transfer.from}-${transfer.to}`}
                    style={{ ...textStyle, fontSize: 'var(--text-xl)', fontWeight: 600 }}
                  >
                    {describe(transfer)} {money(transfer.amount)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={cardStyle}>
            <ul aria-label="People" style={{ ...listStyle, gap: 16 }}>
              {balances.map((balance) => {
                const owes = balance.net.startsWith('-')
                const settled = Number(balance.net) === 0
                return (
                  <li key={balance.personId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ ...textStyle, fontWeight: 600 }}>{balance.name}</span>
                      <span style={{ ...textStyle, color: owes ? 'var(--negative-700)' : 'var(--ink-900)' }}>
                        {settled ? (
                          'Settled'
                        ) : (
                          <>{owes ? 'Owes' : 'Gets back'} {money(balance.net.replace('-', ''))}</>
                        )}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 16 }}>
                      <span style={mutedStyle}>Paid {money(balance.paid)}</span>
                      <span style={mutedStyle}>Share {money(balance.share)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
