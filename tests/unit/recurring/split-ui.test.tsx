import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecurringManager from '@/components/recurring/RecurringManager'
import { isScheduledOccurrence } from '@/lib/recurrence'
import type { RecurringTemplateRow } from '@/lib/types'

const actions = vi.hoisted(() => ({
  createRecurringTemplate: vi.fn(),
  updateRecurringTemplate: vi.fn(),
  deleteRecurringTemplate: vi.fn(),
}))
vi.mock('@/app/actions/recurring', () => actions)
vi.mock('@/components/shared/Toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const SELF = { id: 'p-self', name: 'Rafa', isSelf: true, defaultShareBps: 5000 }
const ANA = { id: 'p-ana', name: 'Ana', isSelf: false, defaultShareBps: 5000 }
const groups = [{ id: 'g1', name: 'Casa', subcategories: [{ id: 'sub-1', name: 'Rent' }] }]
// A template created before payer and split existed
const legacy: RecurringTemplateRow = {
  id: 'tmpl-1', amount: '500.00', subcategoryId: 'sub-1', subcategoryName: 'Rent', groupId: 'g1',
  groupName: 'Casa', startDate: '2024-01-15', interval: 'monthly', dayOfMonth: 15, active: true,
  lastRenewedAt: null, lastGeneratedDate: null, nextExecutionDate: '2026-07-15',
  payerPersonId: null, splitMode: 'personal', shares: [],
}
const APPLY = 'Also apply to expenses already generated this month'

beforeEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const renderList = (template = legacy, people = [SELF, ANA]) =>
  render(<RecurringManager templates={[template]} groups={groups} people={people} currency="DKK" />)

describe('RecurringManager payer and split', () => {
  it('TC-21-08: shows payer and mode on each row', () => {
    renderList({ ...legacy, payerPersonId: 'p-ana', splitMode: 'split' })
    expect(screen.getByText('Paid by Ana')).toBeInTheDocument()
    expect(screen.getByText('Split')).toBeInTheDocument()
  })

  it('shows self as payer of a legacy template, and nothing while only self exists', () => {
    renderList()
    expect(screen.getByText('Paid by Rafa')).toBeInTheDocument()
    cleanup()
    renderList(legacy, [SELF])
    expect(screen.queryByText(/Paid by/)).not.toBeInTheDocument()
  })

  it('new templates default to split with the default percentages', async () => {
    const user = userEvent.setup()
    renderList()
    await user.click(screen.getByRole('button', { name: 'Add recurring expense' }))
    expect(screen.getByRole('radio', { name: 'Split' })).toBeChecked()
    expect(screen.getByLabelText('Ana percentage')).toHaveValue('50')
    expect(screen.queryByRole('checkbox', { name: APPLY })).not.toBeInTheDocument()
  })

  it('TC-21-08: offers the current-month option, off by default, only after payer or split changes', async () => {
    const user = userEvent.setup()
    renderList()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('radio', { name: 'Personal' })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: APPLY })).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Paid by'), 'p-ana')
    expect(screen.getByRole('checkbox', { name: APPLY })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(actions.updateRecurringTemplate).toHaveBeenCalledWith(
      'tmpl-1',
      expect.objectContaining({ payerPersonId: 'p-ana', splitMode: 'personal' }),
      { applyToCurrentMonth: false },
    ))
  })

  it('sends the option when checked', async () => {
    const user = userEvent.setup()
    renderList()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.selectOptions(screen.getByLabelText('Paid by'), 'p-ana')
    await user.click(screen.getByRole('radio', { name: 'Split' }))
    await user.click(screen.getByRole('checkbox', { name: APPLY }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(actions.updateRecurringTemplate).toHaveBeenCalledWith(
      'tmpl-1',
      expect.objectContaining({
        payerPersonId: 'p-ana',
        splitMode: 'split',
        shares: [{ personId: 'p-self', percent: '50' }, { personId: 'p-ana', percent: '50' }],
      }),
      { applyToCurrentMonth: true },
    ))
  })
})

describe('isScheduledOccurrence (TC-21-07)', () => {
  const template = { startDate: '2025-01-31', interval: 'monthly' as const, dayOfMonth: 31 }

  it.each(['2025-01-31', '2025-02-28', '2025-03-31'])('matches the scheduled date %s', (date) => {
    expect(isScheduledOccurrence(template, date)).toBe(true)
  })

  it.each(['2024-12-31', '2025-03-30', '2025-02-01'])('rejects %s', (date) => {
    expect(isScheduledOccurrence(template, date)).toBe(false)
  })

  it('respects the interval', () => {
    const halfYear = { ...template, interval: '6mo' as const }
    expect(isScheduledOccurrence(halfYear, '2025-07-31')).toBe(true)
    expect(isScheduledOccurrence(halfYear, '2025-02-28')).toBe(false)
  })
})
