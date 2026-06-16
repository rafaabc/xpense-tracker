import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RecurringManager from '@/components/recurring/RecurringManager'
import type { RecurringTemplateRow } from '@/lib/types'

// TC-08-05: List of active recurring templates is displayed
// TC-08-06: Each row shows amount, subcategory, interval, next execution date

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/app/actions/recurring', () => ({
  createRecurringTemplate: vi.fn().mockResolvedValue({}),
  updateRecurringTemplate: vi.fn().mockResolvedValue({}),
  deleteRecurringTemplate: vi.fn().mockResolvedValue({}),
  confirmRenewal: vi.fn().mockResolvedValue(undefined),
  updateRenewal: vi.fn().mockResolvedValue(undefined),
}))

const template: RecurringTemplateRow = {
  id: 'tmpl-1',
  amount: '500.00',
  subcategoryId: 'sub-1',
  subcategoryName: 'Rent',
  groupId: 'g1',
  groupName: 'Casa',
  startDate: '2024-01-15',
  interval: 'monthly',
  dayOfMonth: 15,
  active: true,
  lastRenewedAt: null,
  lastGeneratedDate: null,
  nextExecutionDate: '2026-07-15',
}

const groups = [
  {
    id: 'g1',
    name: 'Casa',
    subcategories: [{ id: 'sub-1', name: 'Rent' }],
  },
]

describe('RecurringManager', () => {
  it('TC-08-05: shows empty state when no templates', () => {
    render(<RecurringManager templates={[]} groups={groups} currency="DKK" />)
    expect(screen.getByText(/no recurring expenses/i)).toBeInTheDocument()
  })

  it('TC-08-05: renders the list when templates are provided', () => {
    render(<RecurringManager templates={[template]} groups={groups} currency="DKK" />)
    // At least the group name visible confirms the list rendered
    expect(screen.getByText('Casa')).toBeInTheDocument()
  })

  it('TC-08-06: row displays Group and Subcategory names', () => {
    render(<RecurringManager templates={[template]} groups={groups} currency="DKK" />)
    expect(screen.getByText('Casa')).toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
  })

  it('TC-08-06: row displays interval label', () => {
    render(<RecurringManager templates={[template]} groups={groups} currency="DKK" />)
    expect(screen.getByText(/monthly/i)).toBeInTheDocument()
  })

  it('TC-08-06: row displays formatted amount', () => {
    render(<RecurringManager templates={[template]} groups={groups} currency="DKK" />)
    // formatAmount('500.00', 'DKK') → 'kr 500.00'
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('TC-08-06: row displays next execution date', () => {
    render(<RecurringManager templates={[template]} groups={groups} currency="DKK" />)
    expect(screen.getByText('2026-07-15')).toBeInTheDocument()
  })
})
