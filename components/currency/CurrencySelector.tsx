'use client'

import { useTransition } from 'react'
import { updateCurrency } from '@/app/actions/currency'
import { CURRENCIES, type Currency } from '@/lib/validations/currency'

const CURRENCY_LABELS: Record<Currency, string> = {
  DKK: 'Danish krone (DKK)',
  BRL: 'Brazilian real (BRL)',
}

interface Props {
  current: Currency
}

export default function CurrencySelector({ current }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as Currency
    startTransition(() => { updateCurrency(value) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label
        htmlFor="currency"
        style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          color: 'var(--ink-700)',
        }}
      >
        Display currency
      </label>
      <select
        id="currency"
        name="currency"
        defaultValue={current}
        disabled={isPending}
        onChange={handleChange}
        style={{
          height: 44,
          padding: '0 14px',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-md)',
          color: 'var(--ink-900)',
          background: 'var(--white)',
          border: '1.5px solid var(--border-strong, #DAD6CC)',
          borderRadius: 'var(--radius-md)',
          cursor: isPending ? 'wait' : 'pointer',
          opacity: isPending ? 0.6 : 1,
          maxWidth: 300,
        }}
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {CURRENCY_LABELS[c]}
          </option>
        ))}
      </select>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          color: 'var(--ink-500)',
          margin: 0,
        }}
      >
        Affects how amounts are displayed — stored values are never converted.
      </p>
    </div>
  )
}
