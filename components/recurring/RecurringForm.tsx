'use client'

import { useState } from 'react'
import { validateAmount } from '@/lib/validations/expenses'
import { validateDayOfMonth, validateInterval, validateStartDate } from '@/lib/validations/recurring'
import { INTERVALS } from '@/lib/recurrence'
import type { Interval } from '@/lib/recurrence'

interface SubcategoryOption { id: string; name: string }
interface GroupOption { id: string; name: string; subcategories: SubcategoryOption[] }

export interface RecurringFormValues {
  amount: string
  subcategoryId: string
  startDate: string
  interval: string
  dayOfMonth: string
}

interface InitialValues extends RecurringFormValues {
  id: string
}

interface Props {
  groups: GroupOption[]
  initial?: InitialValues
  onSubmit: (payload: RecurringFormValues) => Promise<void>
  onCancel: () => void
}

const TODAY = new Date().toISOString().slice(0, 10)

export default function RecurringForm({ groups, initial, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [subcategoryId, setSubcategoryId] = useState(initial?.subcategoryId ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? TODAY)
  const [interval, setIntervalVal] = useState<string>(initial?.interval ?? 'monthly')
  const [dayOfMonth, setDayOfMonth] = useState(initial?.dayOfMonth ?? '1')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)

    const amountVal = validateAmount(amount)
    if (!amountVal.ok) { setError(amountVal.error); return }

    const startDateVal = validateStartDate(startDate)
    if (!startDateVal.ok) { setError(startDateVal.error); return }

    const intervalVal = validateInterval(interval)
    if (!intervalVal.ok) { setError(intervalVal.error); return }

    const domVal = validateDayOfMonth(dayOfMonth)
    if (!domVal.ok) { setError(domVal.error); return }

    if (!subcategoryId) { setError('Subcategory is required'); return }

    setSubmitting(true)
    try {
      await onSubmit({ amount: amount.trim(), subcategoryId, startDate, interval, dayOfMonth })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--ink-700)',
    marginBottom: 6,
  } as const

  const inputStyle = {
    width: '100%',
    height: 44,
    padding: '0 12px',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-md)',
    color: 'var(--ink-900)',
    background: 'var(--white)',
    border: '1.5px solid var(--border-strong, #DAD6CC)',
    borderRadius: 'var(--radius-md)',
    boxSizing: 'border-box' as const,
    outline: 'none',
  } as const

  const intervalOptions = Object.entries(INTERVALS) as [Interval, { label: string; monthCount: number }][]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recurring-form-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        background: 'rgba(20, 32, 27, 0.48)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth: 480,
          padding: '28px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <h2
          id="recurring-form-title"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 'var(--text-xl)',
            color: 'var(--ink-900)',
            margin: 0,
          }}
        >
          {initial ? 'Edit recurring expense' : 'Add recurring expense'}
        </h2>

        {error && (
          <div
            role="alert"
            style={{
              background: 'var(--negative-50)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--negative-700)',
            }}
          >
            {error}
          </div>
        )}

        {/* Amount */}
        <div>
          <label htmlFor="rec-amount" style={labelStyle}>Amount</label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-md)',
                color: 'var(--ink-500)',
                pointerEvents: 'none',
              }}
            >
              #
            </span>
            <input
              id="rec-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 28, fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        {/* Subcategory */}
        <div>
          <label htmlFor="rec-subcategory" style={labelStyle}>Subcategory</label>
          <select
            id="rec-subcategory"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            style={{ ...inputStyle, padding: '0 12px', cursor: 'pointer' }}
          >
            <option value="">Select subcategory</option>
            {groups.map((group) => (
              <optgroup key={group.id} label={group.name}>
                {group.subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Start date */}
        <div>
          <label htmlFor="rec-start-date" style={labelStyle}>Start date</label>
          <input
            id="rec-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Interval */}
        <div>
          <label htmlFor="rec-interval" style={labelStyle}>Interval</label>
          <select
            id="rec-interval"
            value={interval}
            onChange={(e) => setIntervalVal(e.target.value)}
            style={{ ...inputStyle, padding: '0 12px', cursor: 'pointer' }}
          >
            {intervalOptions.map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Day of month */}
        <div>
          <label htmlFor="rec-dom" style={labelStyle}>Day of month</label>
          <input
            id="rec-dom"
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
          />
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              color: 'var(--ink-400)',
              margin: '4px 0 0',
            }}
          >
            If the day doesn&apos;t exist in a month, the last day of that month is used.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: 44,
              padding: '0 20px',
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              height: 44,
              padding: '0 20px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--brand, #128A5E)',
              background: 'var(--brand, #128A5E)',
              color: '#fff',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
