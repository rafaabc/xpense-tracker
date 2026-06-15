'use client'

import { useRouter } from 'next/navigation'
import type { GroupBreakdown } from '@/lib/summaries'
import type { Currency } from '@/lib/validations/currency'
import { formatAmount } from '@/lib/format'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function monthOptions() {
  const opts = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const value = `${y}-${m}`
    const label = `${MONTHS[d.getMonth()]} ${y}`
    opts.push({ value, label })
  }
  return opts
}

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

interface Props {
  breakdown: GroupBreakdown[]
  month: string
  currency: Currency
}

export default function MonthlySummary({ breakdown, month, currency }: Props) {
  const router = useRouter()
  const total = breakdown.reduce((s, g) => s + g.subtotal, 0)
  const options = monthOptions()

  function handleMonthChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/summary?tab=monthly&month=${e.target.value}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Month picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label
          htmlFor="month-picker"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            color: 'var(--ink-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
          }}
        >
          Month
        </label>
        <select
          id="month-picker"
          value={month}
          onChange={handleMonthChange}
          style={{
            height: 36,
            padding: '0 32px 0 12px',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            color: 'var(--ink-900)',
            background: 'var(--surface-card)',
            border: '1.5px solid var(--border-strong, #DAD6CC)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {breakdown.length === 0 ? (
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            padding: 'var(--space-8)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-md)',
              color: 'var(--ink-500)',
              margin: 0,
            }}
          >
            No expenses recorded for {formatMonthLabel(month)}.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hero stat */}
          <div
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              padding: 'var(--space-6)',
            }}
          >
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                color: 'var(--ink-500)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              Total — {formatMonthLabel(month)}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
                fontSize: 36,
                color: 'var(--ink-900)',
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
              }}
            >
              {formatAmount(total, currency)}
            </span>
          </div>

          {/* Bar list */}
          <div
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {breakdown.map((g) => (
              <div key={g.groupId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 500,
                      fontSize: 'var(--text-md)',
                      color: 'var(--ink-900)',
                    }}
                  >
                    {g.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--ink-500)',
                      }}
                    >
                      {g.pct}%
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 600,
                        fontSize: 'var(--text-md)',
                        color: 'var(--ink-900)',
                        minWidth: 100,
                        textAlign: 'right',
                      }}
                    >
                      {formatAmount(g.subtotal, currency)}
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: 8,
                    background: 'var(--paper-dim)',
                    borderRadius: 'var(--radius-pill)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${g.pct}%`,
                      height: '100%',
                      background: 'var(--emerald-500)',
                      borderRadius: 'var(--radius-pill)',
                      transition: 'width var(--dur-slow) var(--ease-emphasis)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
