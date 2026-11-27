import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpensesManager from '@/components/expenses/ExpensesManager'

const actions = vi.hoisted(() => ({ createExpense: vi.fn(), updateExpense: vi.fn(), deleteExpense: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/app/actions/expenses', () => actions)
vi.mock('@/components/shared/Toast', () => ({ useToast: () => toast }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams('group=g1'),
}))

const groups = [{ id: 'g1', name: 'Casa', subcategories: [{ id: 's1', name: 'Rent' }] }]
const people = [{ id: 'p-self', name: 'Rafa', isSelf: true, defaultShareBps: 10000 }]
const expense = {
  id: 'e1', amount: '1200.00', date: '2026-06-01', subcategoryId: 's1', subcategoryName: 'Rent',
  groupId: 'g1', groupName: 'Casa', payerPersonId: null, splitMode: 'personal' as const, shares: [],
}
const click = (name: string) => userEvent.click(screen.getByRole('button', { name }))

beforeEach(() => {
  cleanup()
  vi.resetAllMocks()
})

function renderList(page = 1, totalPages = 1) {
  render(
    <ExpensesManager
      expenses={[expense]}
      groups={groups}
      people={people}
      currency="DKK"
      pagination={{ page, totalPages, total: totalPages * 25, pageSize: 25 }}
    />,
  )
}

const flows = {
  createExpense: {
    success: 'Expense added',
    run: async () => {
      renderList()
      await click('Add expense')
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } })
      fireEvent.change(screen.getByLabelText('Subcategory'), { target: { value: 's1' } })
      await click('Save')
    },
  },
  updateExpense: {
    success: 'Expense updated',
    run: async () => {
      renderList()
      await click('Edit')
      await click('Save')
    },
  },
  deleteExpense: {
    success: 'Expense deleted',
    run: async () => {
      renderList()
      await click('Delete')
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete expense' }))
    },
  },
} as const

describe.each(Object.entries(flows))('ExpensesManager %s', (action, { success, run }) => {
  const mock = () => actions[action as keyof typeof actions]

  it('reports success and closes the dialog', async () => {
    await run()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(success))
    expect(mock()).toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a returned error', async () => {
    mock().mockResolvedValue({ error: 'Server says no' })
    await run()
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server says no'))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('shows the server error', async () => {
    mock().mockRejectedValue(new Error('Server says no'))
    await run()
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server says no'))
  })
})

describe('ExpensesManager dialogs and pages', () => {
  it('closes every dialog on cancel', async () => {
    renderList()
    for (const name of ['Add expense', 'Edit', 'Delete']) {
      await click(name)
      await click('Cancel')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }
  })

  it('links to the previous and next page, keeping the filters', () => {
    renderList(2, 3)
    expect(screen.getByRole('link', { name: /prev/i })).toHaveAttribute('href', '/expenses?group=g1&page=1')
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/expenses?group=g1&page=3')
  })

  it('disables next on the last page', () => {
    renderList(3, 3)
    expect(screen.queryByRole('link', { name: 'Next' })).not.toBeInTheDocument()
  })
})
