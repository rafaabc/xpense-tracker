'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses'
import type { ExpenseRow, PersonRow } from '@/lib/types'
import { formatAmount } from '@/lib/format'
import type { Currency } from '@/lib/validations/currency'
import ExpenseForm, { type ExpenseFormValues } from '@/components/expenses/ExpenseForm'
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal'
import { useToast } from '@/components/shared/Toast'
import { unwrap } from '@/lib/action-result'

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
  people: PersonRow[]
  currency: Currency
  pagination: PaginationInfo
}

type EditState = { kind: 'create' } | { kind: 'edit'; expense: ExpenseRow } | null
type DeleteState = { id: string; formatted: string } | null

export default function ExpensesManager({ expenses, groups, people, currency, pagination }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const toast = useToast()
  const [editState, setEditState] = useState<EditState>(null)
  const [deleteState, setDeleteState] = useState<DeleteState>(null)

  function refresh() { router.refresh() }

  // A missing payer (legacy or recurring row) means the user paid
  function payerName(expense: ExpenseRow) {
    const payer = people.find((p) => (expense.payerPersonId ? p.id === expense.payerPersonId : p.isSelf))
    return payer?.name
  }

  async function handleCreate(payload: ExpenseFormValues) {
    try {
      unwrap(await createExpense(payload))
      setEditState(null)
      refresh()
      toast.success('Expense added')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleUpdate(payload: ExpenseFormValues) {
    if (editState?.kind !== 'edit') return
    try {
      unwrap(await updateExpense(editState.expense.id, payload))
      setEditState(null)
      refresh()
      toast.success('Expense updated')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  function handleDeleteConfirm() {
    if (!deleteState) return
    startTransition(async () => {
      try {
        unwrap(await deleteExpense(deleteState.id))
        setDeleteState(null)
        refresh()
        toast.success('Expense deleted')
      } catch (e) {
        toast.error((e as Error).message)
        setDeleteState(null)
      }
    })
  }

  // Column layout lives in app-shell.css (.exp-row) so it can stack on phones
  const rowStyle = {
    alignItems: 'center',
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
            className="exp-row exp-header"
            style={{
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
            <div key={exp.id} className="exp-row" style={rowStyle}>
              {/* Category */}
              <div className="exp-cat" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                {people.length > 1 && (
                  <span
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--ink-500)',
                    }}
                  >
                    <span>{`Paid by ${payerName(exp)}`}</span>
                    {exp.splitMode === 'split' && (
                      <span
                        style={{
                          padding: '0 8px',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--paper)',
                          fontWeight: 600,
                        }}
                      >
                        Split
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Date */}
              <span
                className="exp-date"
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
                className="exp-amount"
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
              <div className="exp-actions" style={{ display: 'flex', gap: 4 }}>
                <button
                  className="exp-btn"
                  style={btnGhost}
                  onClick={() => setEditState({ kind: 'edit', expense: exp })}
                >
                  Edit
                </button>
                <button
                  className="exp-btn"
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
          people={people}
          onSubmit={handleCreate}
          onCancel={() => setEditState(null)}
        />
      )}

      {editState?.kind === 'edit' && (
        <ExpenseForm
          groups={groups}
          people={people}
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
