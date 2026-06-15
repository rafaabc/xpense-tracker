'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmRenewal, updateRenewal } from '@/app/actions/recurring'
import type { RecurringTemplateRow } from '@/app/actions/recurring'
import { validateAmount } from '@/lib/validations/expenses'
import { formatAmount } from '@/lib/format'
import { INTERVALS } from '@/lib/recurrence'
import type { Currency } from '@/lib/validations/currency'

interface Props {
  template: RecurringTemplateRow
  currency: Currency
}

export default function RenewalBanner({ template, currency }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [newAmount, setNewAmount] = useState(template.amount)
  const [amountError, setAmountError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (dismissed) return null

  function handleConfirm() {
    setActionError(null)
    startTransition(async () => {
      try {
        await confirmRenewal(template.id)
        router.refresh()
        setDismissed(true)
      } catch (e) {
        setActionError((e as Error).message)
      }
    })
  }

  function handleUpdate() {
    setAmountError(null)
    setActionError(null)

    const v = validateAmount(newAmount)
    if (!v.ok) { setAmountError(v.error); return }

    startTransition(async () => {
      try {
        await updateRenewal(template.id, newAmount.trim())
        router.refresh()
        setDismissed(true)
      } catch (e) {
        setActionError((e as Error).message)
      }
    })
  }

  const intervalLabel = INTERVALS[template.interval]?.label ?? template.interval

  return (
    <div
      style={{
        background: 'var(--white)',
        border: '1.5px solid var(--brand-200, #A3D9C2)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--brand, #128A5E)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 4px',
            }}
          >
            Annual review
          </p>
          {/* TC-09-03: display current amount, subcategory, interval */}
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-700)',
              margin: 0,
            }}
          >
            <strong>{template.groupName} — {template.subcategoryName}</strong>
            {' '}·{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {formatAmount(template.amount, currency)}
            </span>
            {' '}·{' '}{intervalLabel}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              color: 'var(--ink-500)',
              margin: '4px 0 0',
            }}
          >
            Is this amount still accurate?
          </p>
        </div>

        {/* Snooze (TC-09-09) */}
        <button
          aria-label="Dismiss renewal reminder"
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ink-400)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            flexShrink: 0,
          }}
        >
          Dismiss
        </button>
      </div>

      {actionError && (
        <div
          role="alert"
          style={{
            background: 'var(--negative-50)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--negative-700)',
          }}
        >
          {actionError}
        </div>
      )}

      {/* TC-09-04: Confirm or Update value */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 }}>
        {/* Confirm same value */}
        <button
          onClick={handleConfirm}
          style={{
            height: 38,
            padding: '0 16px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--brand, #128A5E)',
            background: 'var(--brand, #128A5E)',
            color: '#fff',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Confirm — same amount
        </button>

        {/* Update value toggle + inline form */}
        {!updating ? (
          <button
            onClick={() => setUpdating(true)}
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
              whiteSpace: 'nowrap',
            }}
          >
            Update value
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--ink-500)',
                    pointerEvents: 'none',
                  }}
                >
                  #
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  aria-label="New amount"
                  style={{
                    height: 38,
                    width: 120,
                    paddingLeft: 26,
                    paddingRight: 10,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--ink-900)',
                    background: 'var(--white)',
                    border: `1.5px solid ${amountError ? 'var(--negative-500)' : 'var(--border-strong, #DAD6CC)'}`,
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
              </div>
              {amountError && (
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--negative-600)',
                    margin: '3px 0 0',
                  }}
                >
                  {amountError}
                </p>
              )}
            </div>
            <button
              onClick={handleUpdate}
              style={{
                height: 38,
                padding: '0 16px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--brand, #128A5E)',
                background: 'var(--brand, #128A5E)',
                color: '#fff',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Save new amount
            </button>
            <button
              onClick={() => { setUpdating(false); setAmountError(null); setNewAmount(template.amount) }}
              style={{
                height: 38,
                padding: '0 12px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-strong, #DAD6CC)',
                background: 'var(--white)',
                color: 'var(--ink-500)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
