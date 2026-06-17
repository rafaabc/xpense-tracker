'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses'
import type { ExpenseRow } from '@/lib/types'
import { formatAmount } from '@/lib/format'
import type { Currency } from '@/lib/validations/currency'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal'

interface SubcategoryOption { id: string; name: string }
interface GroupOption { id: string; name: string; subcategories: SubcategoryOption[] }

interface PaginationInfo {
  page: number
  totalPages: number
  total: number
  pageSize: number
}

interface Props {
  expenses: ExpenseRow[]
  groups: GroupOption[]
  currency: Currency
  pagination: PaginationInfo
}

type EditState = { kind: 'create' } | { kind: 'edit'; expense: ExpenseRow } | null
type DeleteState = { id: string; formatted: string } | null

export default function ExpensesManager({ expenses, groups, currency, pagination }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [editState, setEditState] = useState<EditState>(null)
  const [deleteState, setDeleteState] = useState<DeleteState>(null)
  const [error, setError] = useState<string | null>(null)

  function refresh() { router.refresh() }

  async function handleCreate(payload: { amount: string; subcategoryId: string; date: string }) {
    await createExpense(payload)
    setEditState(null)
    refresh()
  }

  async function handleUpdate(payload: { amount: string; subcategoryId: string; date: string }) {
    if (editState?.kind !== 'edit') return
    await updateExpense(editState.expense.id, payload)
    setEditState(null)
    refresh()
  }

  function handleDeleteConfirm() {
    if (!deleteState) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteExpense(deleteState.id)
        setDeleteState(null)
        refresh()
      } catch (e) {
        setError((e as Error).message)
        setDeleteState(null)
      }
    })
  }

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto auto',
    alignItems: 'center',
    gap: 16,
    padding: '14px 20px',
    borderBottom: '1px solid var(--line-soft)',
  } as const

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

  function pageHref(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    return `/expenses?${params.toString()}`
  }

  const { page, totalPages, total, pageSize } = pagination
  const rangeStart = (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  const pageLinkStyle = {
    height: 36,
    padding: '0 14px',
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: 'var(--text-sm)',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border-strong, #DAD6CC)',
    background: 'var(--white)',
    color: 'var(--ink-700)',
    textDecoration: 'none',
    cursor: 'pointer',
  } as const

  const pageDisabledStyle = {
    ...pageLinkStyle,
    color: 'var(--ink-300)',
    cursor: 'default',
    pointerEvents: 'none' as const,
  }

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

      {/* Add expense button */}
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
          Add expense
        </button>
      </div>

      {/* Expense list */}
      {expenses.length === 0 ? (
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
            No expenses found
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
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: 16,
              padding: '10px 20px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--paper)',
            }}
          >
            {['Category', 'Date', 'Amount', ''].map((h) => (
              <span
                key={h}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--ink-400)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {expenses.map((exp) => (
            <div key={exp.id} style={rowStyle}>
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
                  {exp.groupName}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--ink-500)',
                  }}
                >
                  {exp.subcategoryName}
                </span>
              </div>

              {/* Date */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--ink-500)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {exp.date}
              </span>

              {/* Amount */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--ink-900)',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatAmount(exp.amount, currency)}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  style={btnGhost}
                  onClick={() => setEditState({ kind: 'edit', expense: exp })}
                >
                  Edit
                </button>
                <button
                  style={btnDanger}
                  onClick={() =>
                    setDeleteState({
                      id: exp.id,
                      formatted: formatAmount(exp.amount, currency),
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

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-500)',
            }}
          >
            Showing{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {rangeStart}–{rangeEnd}
            </span>{' '}
            of{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {total}
            </span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {page > 1 ? (
              <Link href={pageHref(page - 1)} style={pageLinkStyle}>
                Previous
              </Link>
            ) : (
              <span style={pageDisabledStyle}>Previous</span>
            )}

            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                color: 'var(--ink-500)',
                padding: '0 4px',
              }}
            >
              Page{' '}
              <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                {page}
              </span>{' '}
              of{' '}
              <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                {totalPages}
              </span>
            </span>

            {page < totalPages ? (
              <Link href={pageHref(page + 1)} style={pageLinkStyle}>
                Next
              </Link>
            ) : (
              <span style={pageDisabledStyle}>Next</span>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {editState?.kind === 'create' && (
        <ExpenseForm
          groups={groups}
          onSubmit={handleCreate}
          onCancel={() => setEditState(null)}
        />
      )}

      {editState?.kind === 'edit' && (
        <ExpenseForm
          groups={groups}
          initial={editState.expense}
          onSubmit={handleUpdate}
          onCancel={() => setEditState(null)}
        />
      )}

      {/* Delete confirm modal */}
      <DeleteConfirmModal
        open={deleteState !== null}
        title="Delete expense"
        message={`${deleteState?.formatted ?? ''} will be permanently deleted.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteState(null)}
        confirmLabel="Delete expense"
      />
    </div>
  )
}
