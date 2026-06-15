'use client'

import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { Matrix } from '@/lib/summaries'
import type { Currency } from '@/lib/validations/currency'
import { formatAmount } from '@/lib/format'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  matrix: Matrix
  monthTotals: Record<number, number>
  annualTotal: number
  groupAverages: Record<string, number>
  groupNames: Record<string, string>
  year: number
  availableYears: number[]
  currency: Currency
}

function heatCell(value: number, rowMax: number): React.CSSProperties {
  if (value === 0 || rowMax === 0) {
    return {
      background: 'var(--paper-dim)',
      color: 'var(--ink-300)',
    }
  }
  const pct = Math.round(15 + (value / rowMax) * 65)
  return {
    background: `color-mix(in oklch, #128A5E ${pct}%, transparent)`,
    color: pct > 50 ? '#FFFFFF' : 'var(--ink-900)',
  }
}

export default function AnnualSummary({
  matrix,
  monthTotals,
  annualTotal,
  groupAverages,
  groupNames,
  year,
  availableYears,
  currency,
}: Props) {
  const router = useRouter()
  const groupIds = Object.keys(matrix)

  function handleYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/summary?tab=annual&year=${e.target.value}`)
  }

  const chartData = MONTH_LABELS.map((label, i) => ({
    label,
    total: monthTotals[i + 1] ?? 0,
  }))

  const hasData = annualTotal > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Year picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label
          htmlFor="year-picker"
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
          Year
        </label>
        <select
          id="year-picker"
          value={year}
          onChange={handleYearChange}
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
          {availableYears.length > 0 ? (
            availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))
          ) : (
            <option value={year}>{year}</option>
          )}
        </select>
      </div>

      {!hasData ? (
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
            No expenses recorded for {year}.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stats row */}
          <div
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              padding: 'var(--space-6)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 32,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--ink-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Annual total
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                  fontSize: 30,
                  color: 'var(--ink-900)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                {formatAmount(annualTotal, currency)}
              </span>
            </div>
            {groupIds.map((gid) => (
              <div key={gid} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: 'var(--ink-500)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {groupNames[gid]} avg/mo
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                    fontSize: 22,
                    color: 'var(--ink-900)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.05,
                  }}
                >
                  {formatAmount(groupAverages[gid] ?? 0, currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Bar chart */}
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
                marginBottom: 16,
              }}
            >
              Monthly spend — {year}
            </span>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={24} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontFamily: 'var(--font-sans)', fontSize: 12, fill: '#9DAAA2' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'var(--paper-dim)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const val = payload[0].value as number
                    return (
                      <div
                        style={{
                          background: 'var(--surface-card)',
                          border: '1px solid var(--border-soft)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: 'var(--shadow-sm)',
                          padding: '8px 12px',
                          fontFamily: 'var(--font-mono)',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: 14,
                          color: 'var(--ink-900)',
                        }}
                      >
                        {formatAmount(val, currency)}
                      </div>
                    )
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.total === 0 ? '#CDEBDC' : '#128A5E'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Heatmap matrix */}
          {groupIds.length > 0 && (
            <div
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                padding: 'var(--space-6)',
                overflowX: 'auto',
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
                  marginBottom: 16,
                }}
              >
                Breakdown by group
              </span>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        fontWeight: 600,
                        color: 'var(--ink-500)',
                        padding: '4px 12px 4px 0',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Group
                    </th>
                    {MONTH_LABELS.map((m) => (
                      <th
                        key={m}
                        style={{
                          textAlign: 'center',
                          fontWeight: 600,
                          color: 'var(--ink-500)',
                          padding: '4px 4px',
                          minWidth: 56,
                        }}
                      >
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupIds.map((gid) => {
                    const rowMax = Math.max(...Object.values(matrix[gid]))
                    return (
                      <tr key={gid}>
                        <td
                          style={{
                            fontWeight: 500,
                            color: 'var(--ink-900)',
                            padding: '4px 12px 4px 0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {groupNames[gid]}
                        </td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const val = matrix[gid][i + 1] ?? 0
                          const cellStyle = heatCell(val, rowMax)
                          return (
                            <td
                              key={i}
                              style={{
                                textAlign: 'right',
                                padding: '4px 6px',
                                borderRadius: 4,
                                fontFamily: 'var(--font-mono)',
                                fontVariantNumeric: 'tabular-nums',
                                fontSize: 'var(--text-xs)',
                                ...cellStyle,
                              }}
                            >
                              {val > 0 ? formatAmount(val, currency) : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {/* Total row */}
                  <tr>
                    <td
                      style={{
                        fontWeight: 600,
                        color: '#128A5E',
                        padding: '6px 12px 4px 0',
                        whiteSpace: 'nowrap',
                        borderTop: '1px solid var(--line)',
                      }}
                    >
                      Total
                    </td>
                    {Array.from({ length: 12 }, (_, i) => {
                      const val = monthTotals[i + 1] ?? 0
                      return (
                        <td
                          key={i}
                          style={{
                            textAlign: 'right',
                            padding: '6px 6px 4px',
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            background: 'var(--emerald-50)',
                            color: '#128A5E',
                            borderRadius: 4,
                            borderTop: '1px solid var(--line)',
                          }}
                        >
                          {val > 0 ? formatAmount(val, currency) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
