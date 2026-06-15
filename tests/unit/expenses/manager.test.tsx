import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpensesManager from '@/components/ExpensesManager'

// TC-11-11: Empty state message shown when no expenses
// TC-13-01: Delete confirm modal shown before deletion
// TC-13-04: Cancel leaves record untouched (client state)
// TC-13-05: Cancel closes the dialog

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/app/actions/expenses', () => ({
  createExpense: vi.fn().mockResolvedValue({}),
  updateExpense: vi.fn().mockResolvedValue({}),
  deleteExpense: vi.fn().mockResolvedValue({}),
}))

const groups = [
  {
    id: 'g1',
    name: 'Casa',
    subcategories: [{ id: 's1', name: 'Rent' }],
  },
]

const expense = {
  id: 'e1',
  amount: '1200.00',
  date: '2026-06-01',
  subcategoryId: 's1',
  subcategoryName: 'Rent',
  groupId: 'g1',
  groupName: 'Casa',
}

describe('ExpensesManager', () => {
  it('TC-11-11: shows empty state when expenses array is empty', () => {
    render(<ExpensesManager expenses={[]} groups={groups} currency="DKK" />)
    expect(screen.getByText(/no expenses/i)).toBeInTheDocument()
  })

  it('TC-11-11: does not show empty state when expenses exist', () => {
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" />)
    expect(screen.queryByText(/no expenses/i)).not.toBeInTheDocument()
  })

  it('TC-13-01: clicking Delete on a row opens the confirm modal', async () => {
    const user = userEvent.setup()
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" />)
    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('TC-13-04/05: Cancel button on the confirm modal closes the dialog without deleting', async () => {
    const user = userEvent.setup()
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" />)
    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders expense row with group + subcategory', () => {
    render(<ExpensesManager expenses={[expense]} groups={groups} currency="DKK" />)
    expect(screen.getByText('Casa')).toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
  })
})
