import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RenewalBanner from '@/components/recurring/RenewalBanner'
import RecurringManager from '@/components/recurring/RecurringManager'
import type { RecurringTemplateRow } from '@/lib/types'

const actions = vi.hoisted(() => ({
  createRecurringTemplate: vi.fn(), updateRecurringTemplate: vi.fn(), deleteRecurringTemplate: vi.fn(),
  confirmRenewal: vi.fn(), updateRenewal: vi.fn(),
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/app/actions/recurring', () => actions)
vi.mock('@/components/shared/Toast', () => ({ useToast: () => toast }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const template: RecurringTemplateRow = {
  id: 'tmpl-1', amount: '500.00', subcategoryId: 'sub-1', subcategoryName: 'Rent', groupId: 'g1',
  groupName: 'Casa', startDate: '2024-01-15', interval: 'monthly', dayOfMonth: 15, active: true,
  lastRenewedAt: null, lastGeneratedDate: null, nextExecutionDate: '2026-07-15',
  payerPersonId: null, splitMode: 'personal', shares: [],
}
const groups = [{ id: 'g1', name: 'Casa', subcategories: [{ id: 'sub-1', name: 'Rent' }] }]
const people = [{ id: 'p-self', name: 'Rafa', isSelf: true, defaultShareBps: 10000 }]
const click = (name: string) => userEvent.click(screen.getByRole('button', { name }))

beforeEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('RenewalBanner actions', () => {
  const renderBanner = () => render(<RenewalBanner template={template} currency="DKK" />)

  it('confirms the same amount and disappears', async () => {
    renderBanner()
    await click('Confirm — same amount')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Renewal confirmed'))
    expect(actions.confirmRenewal).toHaveBeenCalledWith('tmpl-1')
    expect(screen.queryByText('Annual review')).not.toBeInTheDocument()
  })

  it('saves a new amount', async () => {
    renderBanner()
    await click('Update value')
    fireEvent.change(screen.getByLabelText('New amount'), { target: { value: '750' } })
    await click('Save new amount')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Renewal updated'))
    expect(actions.updateRenewal).toHaveBeenCalledWith('tmpl-1', '750')
  })

  it('validates the new amount and can be cancelled', async () => {
    renderBanner()
    await click('Update value')
    fireEvent.change(screen.getByLabelText('New amount'), { target: { value: '0' } })
    await click('Save new amount')
    expect(actions.updateRenewal).not.toHaveBeenCalled()
    await click('Cancel')
    expect(screen.queryByLabelText('New amount')).not.toBeInTheDocument()
  })

  it.each([
    ['confirmRenewal', ['Confirm — same amount']],
    ['updateRenewal', ['Update value', 'Save new amount']],
  ] as const)('shows the error of %s', async (action, clicks) => {
    actions[action].mockRejectedValue(new Error('Server says no'))
    renderBanner()
    for (const name of clicks) await click(name)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server says no'))
    expect(screen.getByText('Annual review')).toBeInTheDocument()
  })
})

describe('returned errors', () => {
  it('shows the error a renewal action returns', async () => {
    actions.confirmRenewal.mockResolvedValue({ error: 'Server says no' })
    render(<RenewalBanner template={template} currency="DKK" />)
    await click('Confirm — same amount')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server says no'))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('shows the error a template action returns', async () => {
    actions.updateRecurringTemplate.mockResolvedValue({ error: 'Server says no' })
    render(<RecurringManager templates={[template]} groups={groups} people={people} currency="DKK" />)
    await click('Edit')
    await click('Save')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server says no'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('RecurringManager actions', () => {
  const renderList = () =>
    render(<RecurringManager templates={[template]} groups={groups} people={people} currency="DKK" />)

  async function fillCreate() {
    renderList()
    await click('Add recurring expense')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Subcategory'), { target: { value: 'sub-1' } })
    await click('Save')
  }

  it('creates a template', async () => {
    await fillCreate()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Recurring expense added'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    ['createRecurringTemplate', fillCreate],
    ['updateRecurringTemplate', async () => { renderList(); await click('Edit'); await click('Save') }],
  ] as const)('keeps the dialog open when %s fails', async (action, run) => {
    actions[action].mockRejectedValue(new Error('Server says no'))
    await run()
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server says no'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('updates a template and closes edit and create dialogs on cancel', async () => {
    renderList()
    await click('Edit')
    await click('Cancel')
    await click('Add recurring expense')
    await click('Cancel')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await click('Edit')
    await click('Save')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Recurring expense updated'))
  })

  async function confirmDelete() {
    renderList()
    await click('Delete')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete template' }))
  }

  it('deletes after confirmation', async () => {
    await confirmDelete()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Recurring expense deleted'))
    expect(actions.deleteRecurringTemplate).toHaveBeenCalledWith('tmpl-1')
  })

  it('shows a delete error, and cancel keeps the template', async () => {
    actions.deleteRecurringTemplate.mockRejectedValue(new Error('Server says no'))
    await confirmDelete()
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server says no'))
    await click('Delete')
    await click('Cancel')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    ['0', '2024-01-15', '1'],
    ['10', '', '1'],
    ['10', '2024-01-15', '40'],
    ['10', '2024-01-15', '1'], // no subcategory
  ])('blocks an invalid template (%s, %j, %s)', async (amount, startDate, day) => {
    renderList()
    await click('Add recurring expense')
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: amount } })
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: startDate } })
    fireEvent.change(screen.getByLabelText('Day of month'), { target: { value: day } })
    await click('Save')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(actions.createRecurringTemplate).not.toHaveBeenCalled()
  })
})
