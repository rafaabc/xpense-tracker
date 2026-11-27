'use client'

import { useState, type CSSProperties } from 'react'
import { parsePercentToBps, validateSplitTotal, formatBps } from '@/lib/validations/people'
import { SPLIT_MODES, type SplitMode } from '@/lib/split'
import type { PersonRow } from '@/lib/types'

export interface SplitValues {
  payerPersonId: string
  splitMode: SplitMode
  shares?: { personId: string; percent: string }[]
}

export interface StoredSplit {
  payerPersonId?: string | null
  splitMode?: SplitMode
  shares?: { personId: string; shareBps: number }[]
}

const SPLIT_MODE_LABELS: Record<SplitMode, string> = { personal: 'Personal', split: 'Split' }

/**
 * Payer and split state of an expense or a recurring template.
 * Pass `stored` when editing; leave it out for a new record.
 */
export function useSplitFields(people: PersonRow[], stored?: StoredSplit) {
  const selfId = people.find((person) => person.isSelf)?.id ?? ''

  const [initial] = useState(() => ({
    payerPersonId: stored?.payerPersonId ?? selfId,
    // New records are shared by default once there is someone to share with
    splitMode: (stored
      ? (stored.splitMode ?? 'personal')
      : people.length > 1 ? 'split' : 'personal') as SplitMode,
    // A split record shows its stored percentages; otherwise the default split
    percents: Object.fromEntries(
      people.map((person) => {
        const bps =
          stored?.splitMode === 'split'
            ? (stored.shares?.find((s) => s.personId === person.id)?.shareBps ?? 0)
            : person.defaultShareBps
        return [person.id, formatBps(bps)]
      }),
    ) as Record<string, string>,
  }))
  const [payerPersonId, setPayerPersonId] = useState(initial.payerPersonId)
  const [splitMode, setSplitMode] = useState(initial.splitMode)
  const [percents, setPercents] = useState(initial.percents)

  const changed =
    payerPersonId !== initial.payerPersonId ||
    splitMode !== initial.splitMode ||
    (splitMode === 'split' && people.some((p) => percents[p.id] !== initial.percents[p.id]))

  /** The values to submit, or the first validation error. */
  function read(): { ok: true; value: SplitValues } | { ok: false; error: string } {
    const value: SplitValues = { payerPersonId, splitMode }
    if (splitMode !== 'split') return { ok: true, value }

    value.shares = people.map((person) => ({ personId: person.id, percent: percents[person.id] ?? '0' }))
    const bps: number[] = []
    for (const share of value.shares) {
      const parsed = parsePercentToBps(share.percent)
      if (!parsed.ok) return parsed
      bps.push(parsed.value)
    }
    const total = validateSplitTotal(bps)
    return total.ok ? { ok: true, value } : total
  }

  return {
    people, payerPersonId, setPayerPersonId, splitMode, setSplitMode, percents, setPercents, changed, read,
  }
}

interface Props {
  split: ReturnType<typeof useSplitFields>
  /** Prefix for element ids and the radio group name */
  idPrefix: string
  labelStyle: CSSProperties
  inputStyle: CSSProperties
}

/** Payer and split controls; shown once there are two people. */
export default function SplitFields({ split, idPrefix, labelStyle, inputStyle }: Props) {
  const { people, payerPersonId, setPayerPersonId, splitMode, setSplitMode, percents, setPercents } = split
  if (people.length < 2) return null

  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-payer`} style={labelStyle}>Paid by</label>
        <select
          id={`${idPrefix}-payer`}
          value={payerPersonId}
          onChange={(e) => setPayerPersonId(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {people.map((person) => (
            <option key={person.id} value={person.id}>{person.name}</option>
          ))}
        </select>
      </div>

      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={{ ...labelStyle, padding: 0 }}>Sharing</legend>
        <div style={{ display: 'flex', gap: 16 }}>
          {SPLIT_MODES.map((mode) => (
            <label
              key={mode}
              style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400, marginBottom: 0 }}
            >
              <input
                type="radio"
                name={`${idPrefix}-split-mode`}
                value={mode}
                checked={splitMode === mode}
                onChange={() => setSplitMode(mode)}
                style={{ accentColor: 'var(--brand, #128A5E)' }}
              />
              {SPLIT_MODE_LABELS[mode]}
            </label>
          ))}
        </div>

        {splitMode === 'split' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {people.map((person) => (
              <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...labelStyle, flex: 1, fontWeight: 400, marginBottom: 0 }}>{person.name}</span>
                <input
                  aria-label={`${person.name} percentage`}
                  inputMode="decimal"
                  value={percents[person.id] ?? '0'}
                  onChange={(e) => setPercents((all) => ({ ...all, [person.id]: e.target.value }))}
                  style={{ ...inputStyle, width: 96, textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                />
                <span style={{ ...labelStyle, marginBottom: 0 }}>%</span>
              </div>
            ))}
          </div>
        )}
      </fieldset>
    </>
  )
}
