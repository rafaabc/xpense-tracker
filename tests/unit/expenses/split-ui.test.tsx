import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import ExpensesManager from '@/components/expenses/ExpensesManager'

vi.mock('@/components/shared/Toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/app/actions/expenses', () => ({
  createExpense: vi.fn(), updateExpense: vi.fn(), deleteExpense: vi.fn(),
}))

const groups = [{ id: 'g1', name: 'Casa', subcategories: [{ id: 's1', name: 'Rent' }] }]
const SELF = { id: 'p-self', name: 'Rafa', isSelf: true, defaultShareBps: 6000 }
const ANA = { id: 'p-ana', name: 'Ana', isSelf: false, defaultShareBps: 4000 }
const initial = {
  id: 'e1',
  amount: '100.00',
  subcategoryId: 's1',
  date: '2026-06-01',
  payerPersonId: 'p-ana',
  splitMode: 'split' as const,
  shares: [{ personId: 'p-ana', shareBps: 10000 }],
}

beforeEach(() => cleanup())

function renderForm(props: Partial<React.ComponentProps<typeof ExpenseForm>> = {}) {
  const onSubmit = vi.fn()
  render(<ExpenseForm groups={groups} people={[SELF, ANA]} onSubmit={onSubmit} onCancel={vi.fn()} {...props} />)
  return onSubmit
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Amount'), '25')
  await user.selectOptions(screen.getByLabelText('Subcategory'), 's1')
}

describe('ExpenseForm payer and split', () => {
  it('TC-17-05: hides payer and split while only self exists, and submits self as payer', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm({ people: [SELF] })
    expect(screen.queryByLabelText('Paid by')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ payerPersonId: 'p-self', splitMode: 'personal' }))
  })

  it('TC-18-01: defaults to self as payer and a split expense', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm()
    expect(screen.getByLabelText('Paid by')).toHaveValue('p-self')
    expect(screen.getByRole('radio', { name: 'Split' })).toBeChecked()
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({
      amount: '25',
      subcategoryId: 's1',
      date: expect.any(String),
      payerPersonId: 'p-self',
      splitMode: 'split',
      shares: [{ personId: 'p-self', percent: '60' }, { personId: 'p-ana', percent: '40' }],
    })
  })

  it('submits a personal expense without shares when chosen', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm()
    await user.click(screen.getByRole('radio', { name: 'Personal' }))
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ splitMode: 'personal' })
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('shares')
  })

  it('keeps a stored personal expense personal on edit', () => {
    renderForm({ initial: { ...initial, splitMode: 'personal', shares: [] } })
    expect(screen.getByRole('radio', { name: 'Personal' })).toBeChecked()
  })

  it('preloads the default split and submits per-expense edits', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm()
    await user.selectOptions(screen.getByLabelText('Paid by'), 'p-ana')
    await user.click(screen.getByRole('radio', { name: 'Split' }))
    expect(screen.getByLabelText('Rafa percentage')).toHaveValue('60')
    expect(screen.getByLabelText('Ana percentage')).toHaveValue('40')
    await user.clear(screen.getByLabelText('Rafa percentage'))
    await user.type(screen.getByLabelText('Rafa percentage'), '50')
    await user.clear(screen.getByLabelText('Ana percentage'))
    await user.type(screen.getByLabelText('Ana percentage'), '50')
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      payerPersonId: 'p-ana',
      splitMode: 'split',
      shares: [{ personId: 'p-self', percent: '50' }, { personId: 'p-ana', percent: '50' }],
    }))
  })

  it('blocks a split that does not total 100', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm()
    await user.click(screen.getByRole('radio', { name: 'Split' }))
    await user.clear(screen.getByLabelText('Rafa percentage'))
    await user.type(screen.getByLabelText('Rafa percentage'), '10')
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Percentages must add up to 100')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the stored payer and split on edit, with 0% for people left out', () => {
    renderForm({ initial })
    expect(screen.getByLabelText('Paid by')).toHaveValue('p-ana')
    expect(screen.getByRole('radio', { name: 'Split' })).toBeChecked()
    expect(screen.getByLabelText('Rafa percentage')).toHaveValue('0')
    expect(screen.getByLabelText('Ana percentage')).toHaveValue('100')
  })

  it('TC-18-04: shows self as the payer of a legacy expense', () => {
    renderForm({ initial: { ...initial, payerPersonId: null, splitMode: 'personal', shares: [] } })
    expect(screen.getByLabelText('Paid by')).toHaveValue('p-self')
  })
})

describe('ExpensesManager payer column', () => {
  const row = { ...initial, subcategoryName: 'Rent', groupId: 'g1', groupName: 'Casa' }
  const pagination = { page: 1, totalPages: 1, total: 1, pageSize: 25 }
  const renderList = (expense: typeof row | Record<string, unknown>, people = [SELF, ANA]) =>
    render(
      <ExpensesManager
        expenses={[expense as typeof row]}
        groups={groups}
        people={people}
        currency="DKK"
        pagination={pagination}
      />,
    )

  it('shows the payer and a split badge', () => {
    renderList(row)
    expect(screen.getByText('Paid by Ana')).toBeInTheDocument()
    expect(screen.getByText('Split')).toBeInTheDocument()
  })

  it('TC-18-04: reads a missing payer as self, without a badge when personal', () => {
    renderList({ ...row, payerPersonId: null, splitMode: 'personal', shares: [] })
    expect(screen.getByText('Paid by Rafa')).toBeInTheDocument()
    expect(screen.queryByText('Split')).not.toBeInTheDocument()
  })

  it('hides the payer while only self exists', () => {
    renderList({ ...row, payerPersonId: 'p-self', splitMode: 'personal' }, [SELF])
    expect(screen.queryByText(/Paid by/)).not.toBeInTheDocument()
  })
})
