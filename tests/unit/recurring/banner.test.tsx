import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RenewalBanner from '@/components/recurring/RenewalBanner'

vi.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

// Mock server actions + router
vi.mock('@/app/actions/recurring', () => ({
  confirmRenewal: vi.fn().mockResolvedValue(undefined),
  updateRenewal: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const template = {
  id: 'tmpl-1',
  amount: '500.00',
  subcategoryId: 'sub-1',
  subcategoryName: 'Rental',
  groupId: 'g1',
  groupName: 'Casa',
  startDate: '2024-01-15',
  interval: 'monthly' as const,
  dayOfMonth: 15,
  active: true,
  lastRenewedAt: null,
  lastGeneratedDate: null,
  nextExecutionDate: '2025-01-15',
}

describe('RenewalBanner', () => {
  it('displays current amount, subcategory, and interval (TC-09-03)', () => {
    render(<RenewalBanner template={template} currency="DKK" />)

    expect(screen.getByText(/Casa/)).toBeInTheDocument()
    expect(screen.getByText(/Rental/)).toBeInTheDocument()
    expect(screen.getByText(/Monthly/i)).toBeInTheDocument()
    // Amount is shown via formatAmount
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('offers Confirm and Update value options (TC-09-04)', () => {
    render(<RenewalBanner template={template} currency="DKK" />)

    expect(screen.getByRole('button', { name: /confirm.*same amount/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update value/i })).toBeInTheDocument()
  })

  it('shows new amount input when Update value is clicked', () => {
    render(<RenewalBanner template={template} currency="DKK" />)

    fireEvent.click(screen.getByRole('button', { name: /update value/i }))
    expect(screen.getByLabelText(/new amount/i)).toBeInTheDocument()
  })

  it('dismisses when Dismiss is clicked (snooze, TC-09-09)', () => {
    render(<RenewalBanner template={template} currency="DKK" />)

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    // Banner should no longer be in the document
    expect(screen.queryByText(/annual review/i)).not.toBeInTheDocument()
  })

  it('TC-09-10: re-mounting banner (new login) re-shows it after prior dismiss', () => {
    const { unmount } = render(<RenewalBanner template={template} currency="DKK" />)

    // Dismiss the banner
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText(/annual review/i)).not.toBeInTheDocument()

    // Simulate navigation away (unmount) and back (new login / page load = remount)
    unmount()
    render(<RenewalBanner template={template} currency="DKK" />)

    // Local dismissed state resets on remount — banner visible again
    expect(screen.getByText(/annual review/i)).toBeInTheDocument()
  })
})
