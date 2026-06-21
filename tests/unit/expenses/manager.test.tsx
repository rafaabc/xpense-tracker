import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpensesManager from '@/components/expenses/ExpensesManager'

vi.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

// TC-11-03: Row displays Group name
// TC-11-04: Row displays Subcategory name
// TC-11-05: Row displays Date
// TC-11-11: Empty state message shown when no expenses
// TC-12-06: Edit form closes after successful save (save confirmed)
// TC-13-01: Delete confirm modal shown before deletion
// TC-13-04: Cancel leaves record untouched (client state)
// TC-13-05: Cancel closes the dialog
// TC-13-06: Deletion confirm modal shows confirm button
// TC-13-07: router.refresh() called after successful deletion

const mockRefresh = vi.hoisted(() => vi.fn())
const mockUpdateExpense = vi.hoisted(() => vi.fn().mockResolvedValue({}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/app/actions/expenses', () => ({
  createExpense: vi.fn().mockResolvedValue({}),
  updateExpense: mockUpdateExpense,
  deleteExpense: vi.fn().mockResolvedValue({}),
}))

const groups = [
  {
    id: 'g1',
    name: 'Casa',
    subcategories: [{ id: 's1', name: 'Rent' }],
  },
]

const defaultPagination = { page: 1, totalPages: 1, total: 1, pageSize: 25 }

const expense = {
  id: 'e1',
  amount: '1200.00',
  date: '2026-06-01',
  subcategoryId: 's1',
  subcategoryName: 'Rent',
  groupId: 'g1',
  groupName: 'Casa',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateExpense.mockResolvedValue({})
})

describe('ExpensesManager', () => {
  it('TC-11-11: shows empty state when expenses array is empty', () => {
    render(<ExpensesManager expenses={[]} groups={groups} currency="DKK" pagination={defaultPagination} />)
    expect(screen.getByText(/no expenses/i)).toBeInTheDocument()
  })

  it('TC-11-11: does not show empty state when expenses exist', () => {
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" pagination={defaultPagination} />)
    expect(screen.queryByText(/no expenses/i)).not.toBeInTheDocument()
  })

  it('TC-11-03: row displays Group name', () => {
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" pagination={defaultPagination} />)
    expect(screen.getByText('Casa')).toBeInTheDocument()
  })

  it('TC-11-04: row displays Subcategory name', () => {
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" pagination={defaultPagination} />)
    expect(screen.getByText('Rent')).toBeInTheDocument()
  })

  it('TC-11-05: row displays Date', () => {
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" pagination={defaultPagination} />)
    expect(screen.getByText('2026-06-01')).toBeInTheDocument()
  })

  it('TC-13-01: clicking Delete on a row opens the confirm modal', async () => {
    const user = userEvent.setup()
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" pagination={defaultPagination} />)
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('TC-13-06: delete confirm modal shows the confirmation button', async () => {
    const user = userEvent.setup()
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" pagination={defaultPagination} />)
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    // The confirmLabel passed is "Delete expense"
    expect(screen.getByRole('button', { name: /delete expense/i })).toBeInTheDocument()
  })

  it('TC-13-04/05: Cancel button on the confirm modal closes the dialog without deleting', async () => {
    const user = userEvent.setup()
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" pagination={defaultPagination} />)
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('TC-13-07: router.refresh() called after successful deletion', async () => {
    const user = userEvent.setup()
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" pagination={defaultPagination} />)
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    await user.click(screen.getByRole('button', { name: /delete expense/i }))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledOnce())
  })

  it('TC-12-06: edit form closes after successful save (save confirmed)', async () => {
    const user = userEvent.setup()
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" pagination={defaultPagination} />)

    // Open edit form
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByRole('dialog', { name: /edit expense/i })).toBeInTheDocument()

    // Save with pre-filled valid data
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    // Form closes — save confirmed
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /edit expense/i })).not.toBeInTheDocument()
    })
    expect(mockUpdateExpense).toHaveBeenCalledOnce()
  })
})
