import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpenseForm from '@/components/expenses/ExpenseForm'

// TC-10-01: Form requires Amount, Subcategory, Date
// TC-10-02: Subcategory picker grouped by parent Group (optgroup)
// TC-10-03: Date defaults to today
// TC-12-01: Form pre-populated with existing values on edit

const TODAY = new Date().toISOString().slice(0, 10)

const groups = [
  {
    id: 'g1',
    name: 'Casa',
    subcategories: [
      { id: 's1', name: 'Rent' },
      { id: 's2', name: 'Utilities' },
    ],
  },
  {
    id: 'g2',
    name: 'Food',
    subcategories: [
      { id: 's3', name: 'Groceries' },
    ],
  },
]

describe('ExpenseForm', () => {
  it('TC-10-01: renders Amount, Subcategory, and Date fields', () => {
    render(<ExpenseForm groups={groups} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/subcategory/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
  })

  it('TC-10-02: subcategory select uses optgroup per parent group', () => {
    render(<ExpenseForm groups={groups} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const optgroups = document.querySelectorAll('optgroup')
    expect(optgroups).toHaveLength(2)
    expect(optgroups[0].label).toBe('Casa')
    expect(optgroups[1].label).toBe('Food')
  })

  it('TC-10-02: all subcategories appear as options within their group', () => {
    render(<ExpenseForm groups={groups} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('option', { name: 'Rent' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Utilities' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Groceries' })).toBeInTheDocument()
  })

  it('TC-10-03: date field defaults to today', () => {
    render(<ExpenseForm groups={groups} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement
    expect(dateInput.value).toBe(TODAY)
  })

  it('TC-12-01: pre-populates amount when initial values provided', () => {
    render(
      <ExpenseForm
        groups={groups}
        initial={{ id: 'e1', amount: '42.50', subcategoryId: 's2', date: '2026-05-01' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement
    expect(amountInput.value).toBe('42.50')
  })

  it('TC-12-01: pre-populates date when initial values provided', () => {
    render(
      <ExpenseForm
        groups={groups}
        initial={{ id: 'e1', amount: '42.50', subcategoryId: 's2', date: '2026-05-01' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement
    expect(dateInput.value).toBe('2026-05-01')
  })

  it('TC-12-01: pre-selects subcategory when initial values provided', () => {
    render(
      <ExpenseForm
        groups={groups}
        initial={{ id: 'e1', amount: '42.50', subcategoryId: 's2', date: '2026-05-01' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const select = screen.getByLabelText(/subcategory/i) as HTMLSelectElement
    expect(select.value).toBe('s2')
  })

  it('shows validation error for future date on submit', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm groups={groups} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    await user.clear(screen.getByLabelText(/amount/i))
    await user.type(screen.getByLabelText(/amount/i), '10.00')
    await user.clear(screen.getByLabelText(/date/i))
    await user.type(screen.getByLabelText(/date/i), '2099-01-01')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows validation error for zero amount on submit', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm groups={groups} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    await user.clear(screen.getByLabelText(/amount/i))
    await user.type(screen.getByLabelText(/amount/i), '0')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel button clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ExpenseForm groups={groups} onSubmit={vi.fn()} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
