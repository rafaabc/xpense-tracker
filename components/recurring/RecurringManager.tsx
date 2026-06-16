'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createRecurringTemplate,
  updateRecurringTemplate,
  deleteRecurringTemplate,
} from '@/app/actions/recurring'
import type { RecurringTemplateRow } from '@/lib/types'
import { formatAmount } from '@/lib/format'
import { INTERVALS } from '@/lib/recurrence'
import type { Currency } from '@/lib/validations/currency'
import RecurringForm from '@/components/recurring/RecurringForm'
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal'

interface SubcategoryOption { id: string; name: string }
interface GroupOption { id: string; name: string; subcategories: SubcategoryOption[] }

interface Props {
  templates: RecurringTemplateRow[]
  groups: GroupOption[]
  currency: Currency
}

type EditState =
  | { kind: 'create' }
  | { kind: 'edit'; template: RecurringTemplateRow }
  | null

type DeleteState = { id: string; label: string } | null

export default function RecurringManager({ templates, groups, currency }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editState, setEditState] = useState<EditState>(null)
  const [deleteState, setDeleteState] = useState<DeleteState>(null)
  const [error, setError] = useState<string | null>(null)

  function refresh() { router.refresh() }

  async function handleCreate(payload: {
    amount: string; subcategoryId: string; startDate: string; interval: string; dayOfMonth: string
  }) {
    await createRecurringTemplate(payload)
    setEditState(null)
    refresh()
  }

  async function handleUpdate(payload: {
    amount: string; subcategoryId: string; startDate: string; interval: string; dayOfMonth: string
  }) {
    if (editState?.kind !== 'edit') return
    await updateRecurringTemplate(editState.template.id, payload)
    setEditState(null)
    refresh()
  }

  function handleDeleteConfirm() {
    if (!deleteState) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteRecurringTemplate(deleteState.id)
        setDeleteState(null)
        refresh()
      } catch (e) {
        setError((e as Error).message)
        setDeleteState(null)
      }
    })
  }

  const headerLabelStyle = {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    color: 'var(--ink-400)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  }

  const btnGhost = {
    height: 32,
    padding: '0 12px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: 'var(--text-xs)',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid transparent',
    background: 'transparent',
    color: 'var(--ink-500)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  }

  const btnDanger = { ...btnGhost, color: 'var(--negative-500)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setEditState({ kind: 'create' })}
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
            cursor: 'pointer',
          }}
        >
          Add recurring expense
        </button>
      </div>

      {/* Template list */}
      {templates.length === 0 ? (
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-md)',
              color: 'var(--ink-400)',
              margin: 0,
            }}
          >
            No recurring expenses set up
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 120px 140px auto',
              gap: 16,
              padding: '10px 20px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--paper)',
            }}
          >
            {['Category', 'Interval', 'Amount', 'Next on', ''].map((h) => (
              <span key={h} style={headerLabelStyle}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 120px 140px auto',
                alignItems: 'center',
                gap: 16,
                padding: '14px 20px',
                borderBottom: '1px solid var(--line-soft)',
              }}
            >
              {/* Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--ink-900)',
                  }}
                >
                  {tmpl.groupName}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--ink-500)',
                  }}
                >
                  {tmpl.subcategoryName}
                </span>
              </div>

              {/* Interval */}
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--ink-600)',
                }}
              >
                {INTERVALS[tmpl.interval]?.label ?? tmpl.interval}
              </span>

              {/* Amount */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--ink-900)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatAmount(tmpl.amount, currency)}
              </span>

              {/* Next execution date */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--ink-500)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {tmpl.nextExecutionDate}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  style={btnGhost}
                  onClick={() => setEditState({ kind: 'edit', template: tmpl })}
                >
                  Edit
                </button>
                <button
                  style={btnDanger}
                  onClick={() =>
                    setDeleteState({
                      id: tmpl.id,
                      label: `${tmpl.groupName} — ${tmpl.subcategoryName}`,
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {editState?.kind === 'create' && (
        <RecurringForm
          groups={groups}
          onSubmit={handleCreate}
          onCancel={() => setEditState(null)}
        />
      )}

      {/* Edit modal */}
      {editState?.kind === 'edit' && (
        <RecurringForm
          groups={groups}
          initial={{
            id: editState.template.id,
            amount: editState.template.amount,
            subcategoryId: editState.template.subcategoryId,
            startDate: editState.template.startDate,
            interval: editState.template.interval,
            dayOfMonth: String(editState.template.dayOfMonth),
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditState(null)}
        />
      )}

      {/* Delete confirm */}
      <DeleteConfirmModal
        open={deleteState !== null}
        title="Delete recurring expense"
        message={`"${deleteState?.label ?? ''}" will be deleted. Past generated expenses are kept.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteState(null)}
        confirmLabel="Delete template"
      />
    </div>
  )
}
