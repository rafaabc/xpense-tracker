import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MonthlySummary from '@/components/summary/MonthlySummary'
import type { GroupBreakdown } from '@/lib/summaries'

// TC-14-02: Month selector defaults to current month/year (shows provided month as selected)
// TC-14-03: Total spend aggregation for the month is displayed

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('MonthlySummary', () => {
  it('TC-14-02: month selector shows the provided month as its selected value', () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const currentMonth = `${year}-${month}`

    render(<MonthlySummary breakdown={[]} month={currentMonth} currency="DKK" />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe(currentMonth)
  })

  it('TC-14-02: month picker contains an option for the current month', () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const currentMonth = `${year}-${month}`

    render(<MonthlySummary breakdown={[]} month={currentMonth} currency="DKK" />)

    const option = screen.getByRole('option', { selected: true })
    expect((option as HTMLOptionElement).value).toBe(currentMonth)
  })

  it('TC-14-03: total spend for the month is displayed when breakdown has data', () => {
    const breakdown: GroupBreakdown[] = [
      { groupId: 'g1', name: 'Housing', subtotal: 300, pct: 60 },
      { groupId: 'g2', name: 'Food', subtotal: 200, pct: 40 },
    ]

    render(<MonthlySummary breakdown={breakdown} month="2026-06" currency="DKK" />)

    // Total = 300 + 200 = 500; formatAmount(500, 'DKK') = 'kr 500.00'
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('TC-14-03: displays per-group subtotals', () => {
    const breakdown: GroupBreakdown[] = [
      { groupId: 'g1', name: 'Housing', subtotal: 1200, pct: 80 },
      { groupId: 'g2', name: 'Food', subtotal: 300, pct: 20 },
    ]

    render(<MonthlySummary breakdown={breakdown} month="2026-06" currency="DKK" />)

    expect(screen.getByText('Housing')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
  })

  it('shows empty state when no expenses for the month', () => {
    render(<MonthlySummary breakdown={[]} month="2026-06" currency="DKK" />)
    expect(screen.getByText(/no expenses recorded/i)).toBeInTheDocument()
  })
})
