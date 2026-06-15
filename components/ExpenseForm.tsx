'use client'

import { useState } from 'react'
import { validateAmount, validateExpenseDate } from '@/lib/validations/expenses'

interface SubcategoryOption { id: string; name: string }
interface GroupOption { id: string; name: string; subcategories: SubcategoryOption[] }

interface InitialValues {
  id: string
  amount: string
  subcategoryId: string
  date: string
}

interface Props {
  groups: GroupOption[]
  initial?: InitialValues
  onSubmit: (payload: { amount: string; subcategoryId: string; date: string }) => Promise<void>
  onCancel: () => void
}

const TODAY = new Date().toISOString().slice(0, 10)

export default function ExpenseForm({ groups, initial, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [subcategoryId, setSubcategoryId] = useState(initial?.subcategoryId ?? '')
  const [date, setDate] = useState(initial?.date ?? TODAY)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)

    const amountVal = validateAmount(amount)
    if (!amountVal.ok) { setError(amountVal.error); return }

    const dateVal = validateExpenseDate(date)
    if (!dateVal.ok) { setError(dateVal.error); return }

    if (!subcategoryId) { setError('Subcategory is required'); return }

    setSubmitting(true)
    try {
      await onSubmit({ amount: amount.trim(), subcategoryId, date })
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-form-title"
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
          maxWidth: 440,
          padding: '28px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <h2
          id="expense-form-title"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 'var(--text-xl)',
            color: 'var(--ink-900)',
            margin: 0,
          }}
        >
          {initial ? 'Edit expense' : 'Add expense'}
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
          <label htmlFor="expense-amount" style={labelStyle}>Amount</label>
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
              id="expense-amount"
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
          <label htmlFor="expense-subcategory" style={labelStyle}>Subcategory</label>
          <select
            id="expense-subcategory"
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

        {/* Date */}
        <div>
          <label htmlFor="expense-date" style={labelStyle}>Date</label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
          />
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
