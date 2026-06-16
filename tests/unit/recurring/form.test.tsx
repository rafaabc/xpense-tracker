import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RecurringForm from '@/components/recurring/RecurringForm'

const groups = [
  {
    id: 'g1',
    name: 'Casa',
    subcategories: [{ id: 'sub-1', name: 'Rental' }],
  },
]

describe('RecurringForm', () => {
  it('renders all required fields (TC-08-01)', () => {
    render(
      <RecurringForm
        groups={groups}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/subcategory/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/interval/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/day of month/i)).toBeInTheDocument()
  })

  it('shows all three interval options (TC-08-02)', () => {
    render(
      <RecurringForm
        groups={groups}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const select = screen.getByLabelText(/interval/i)
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value)
    expect(options).toContain('monthly')
    expect(options).toContain('6mo')
    expect(options).toContain('12mo')
  })

  it('shows validation error when amount is empty and save is clicked', async () => {
    render(
      <RecurringForm
        groups={groups}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn()
    render(
      <RecurringForm
        groups={groups}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('pre-populates fields when initial values are provided', () => {
    render(
      <RecurringForm
        groups={groups}
        initial={{
          id: 'tmpl-1',
          amount: '500.00',
          subcategoryId: 'sub-1',
          startDate: '2024-01-15',
          interval: '6mo',
          dayOfMonth: '15',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect((screen.getByLabelText(/amount/i) as HTMLInputElement).value).toBe('500.00')
    expect((screen.getByLabelText(/interval/i) as HTMLSelectElement).value).toBe('6mo')
    expect((screen.getByLabelText(/day of month/i) as HTMLInputElement).value).toBe('15')
  })
})
