'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPerson, renamePerson, deletePerson, updateDefaultSplit } from '@/app/actions/people'
import { validatePersonName, parsePercentToBps, validateSplitTotal, formatBps } from '@/lib/validations/people'
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal'
import { useToast } from '@/components/shared/Toast'
import type { PersonRow } from '@/lib/types'
import { unwrap } from '@/lib/action-result'

const inputStyle = {
  height: 38,
  padding: '0 12px',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
  color: 'var(--ink-900)',
  background: 'var(--white)',
  border: '1.5px solid var(--border-strong, #DAD6CC)',
  borderRadius: 'var(--radius-md)',
  flex: 1,
  minWidth: 0,
} as const

const btnPrimary = {
  height: 38,
  padding: '0 16px',
  fontFamily: 'var(--font-sans)',
  fontWeight: 600,
  fontSize: 'var(--text-sm)',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--brand)',
  background: 'var(--brand)',
  color: '#fff',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
} as const

const btnSecondary = {
  ...btnPrimary,
  border: '1.5px solid var(--border-strong, #DAD6CC)',
  background: 'var(--white)',
  color: 'var(--ink-700)',
} as const

const btnGhost = {
  ...btnPrimary,
  height: 30,
  padding: '0 10px',
  fontSize: 'var(--text-xs)',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid transparent',
  background: 'transparent',
  color: 'var(--ink-500)',
} as const

const nameStyle = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
  color: 'var(--ink-700)',
  flex: 1,
  minWidth: 0,
} as const

const rowStyle = { display: 'flex', alignItems: 'center', gap: 8 } as const

export default function PeopleManager({ people }: { people: PersonRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null)
  const [deleting, setDeleting] = useState<PersonRow | null>(null)
  // Unsaved percentage edits; untouched people show their stored share.
  const [percentEdits, setPercentEdits] = useState<Record<string, string>>({})

  const percentOf = (p: PersonRow) => percentEdits[p.id] ?? formatBps(p.defaultShareBps)

  function run(action: () => Promise<unknown>, successMessage: string, onDone: () => void) {
    startTransition(async () => {
      try {
        unwrap(await action())
        onDone()
        router.refresh()
        toast.success(successMessage)
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const check = validatePersonName(newName)
    if (!check.ok) { toast.error(check.error); return }
    run(() => createPerson(check.value), 'Person added', () => setNewName(''))
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!renaming) return
    const check = validatePersonName(renaming.value)
    if (!check.ok) { toast.error(check.error); return }
    run(() => renamePerson(renaming.id, check.value), 'Person renamed', () => setRenaming(null))
  }

  function handleDelete() {
    if (!deleting) return
    const { id } = deleting
    setDeleting(null)
    run(() => deletePerson(id), 'Person deleted', () => setPercentEdits({}))
  }

  function handleSaveSplit(e: React.FormEvent) {
    e.preventDefault()
    const shares = people.map((p) => ({ personId: p.id, percent: percentOf(p) }))

    const bps: number[] = []
    for (const share of shares) {
      const parsed = parsePercentToBps(share.percent)
      if (!parsed.ok) { toast.error(parsed.error); return }
      bps.push(parsed.value)
    }
    const total = validateSplitTotal(bps)
    if (!total.ok) { toast.error(total.error); return }

    run(() => updateDefaultSplit(shares), 'Default split saved', () => setPercentEdits({}))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {people.map((person) =>
          renaming?.id === person.id ? (
            <form key={person.id} onSubmit={handleRename} style={rowStyle}>
              <input
                autoFocus
                aria-label={`Name for ${person.name}`}
                style={inputStyle}
                value={renaming.value}
                onChange={(e) => setRenaming({ id: person.id, value: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(null) }}
              />
              <button type="submit" style={btnPrimary} disabled={isPending}>Save</button>
              <button type="button" style={btnSecondary} onClick={() => setRenaming(null)}>Cancel</button>
            </form>
          ) : (
            <div key={person.id} style={rowStyle}>
              <span style={nameStyle}>
                {person.name}
                {person.isSelf && <span style={{ color: 'var(--ink-500)' }}> (you)</span>}
              </span>
              <button
                type="button"
                style={btnGhost}
                aria-label={`Rename ${person.name}`}
                onClick={() => setRenaming({ id: person.id, value: person.name })}
              >
                Rename
              </button>
              {!person.isSelf && (
                <button
                  type="button"
                  style={{ ...btnGhost, color: 'var(--negative-500)' }}
                  aria-label={`Delete ${person.name}`}
                  onClick={() => setDeleting(person)}
                >
                  Delete
                </button>
              )}
            </div>
          ),
        )}
      </div>

      <form onSubmit={handleAdd} style={rowStyle}>
        <input
          aria-label="New person name"
          placeholder="Person name"
          style={inputStyle}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" style={btnPrimary} disabled={isPending}>Add person</button>
      </form>

      {people.length > 1 && (
        <form
          onSubmit={handleSaveSplit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            borderTop: '1px solid var(--line)',
            paddingTop: 16,
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'var(--text-md)',
              color: 'var(--ink-900)',
              margin: 0,
            }}
          >
            Default split
          </h3>
          <p style={{ ...nameStyle, color: 'var(--ink-500)', margin: 0 }}>
            Used for new shared expenses. Percentages must add up to 100.
          </p>
          {people.map((person) => (
            <label key={person.id} style={rowStyle}>
              <span style={nameStyle}>{person.name}</span>
              <input
                aria-label={`${person.name} percentage`}
                inputMode="decimal"
                style={{ ...inputStyle, flex: '0 0 96px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                value={percentOf(person)}
                onChange={(e) => setPercentEdits((edits) => ({ ...edits, [person.id]: e.target.value }))}
              />
              <span style={{ ...nameStyle, flex: 'none' }}>%</span>
            </label>
          ))}
          <button type="submit" style={{ ...btnPrimary, alignSelf: 'flex-start' }} disabled={isPending}>
            Save split
          </button>
        </form>
      )}

      <DeleteConfirmModal
        open={deleting !== null}
        title="Delete person"
        message={`"${deleting?.name ?? ''}" will be permanently deleted. Any default share goes back to you.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        confirmLabel="Delete person"
      />
    </div>
  )
}
