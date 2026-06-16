import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnnualSummary from '@/components/summary/AnnualSummary'
import type { Matrix } from '@/lib/summaries'

// TC-15-03: Completed-year totals and per-group averages displayed
// TC-15-08: Groups × Months matrix rendered
// TC-15-11: Month-over-month trend chart rendered

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock recharts to avoid ResizeObserver/SVG issues in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-container">{children}</div>
  ),
  Cell: () => null,
}))

// Build a full 12-month zero-filled matrix row for a group
function makeRow(values: Partial<Record<number, number>> = {}): Record<number, number> {
  const row: Record<number, number> = {}
  for (let m = 1; m <= 12; m++) row[m] = values[m] ?? 0
  return row
}

const matrix: Matrix = {
  g1: makeRow({ 1: 500, 6: 300 }),
}
const monthTotals: Record<number, number> = makeRow({ 1: 500, 6: 300 })
const annualTotal = 800
const groupAverages = { g1: 66.67 }
const groupNames = { g1: 'Housing' }

const baseProps = {
  matrix,
  monthTotals,
  annualTotal,
  groupAverages,
  groupNames,
  year: 2025,
  availableYears: [2025],
  currency: 'DKK' as const,
}

describe('AnnualSummary', () => {
  it('TC-15-03: shows "Annual total" heading and formatted total', () => {
    render(<AnnualSummary {...baseProps} />)
    expect(screen.getByText(/annual total/i)).toBeInTheDocument()
    // annualTotal 800 → 'kr 800.00'
    expect(screen.getByText(/800/)).toBeInTheDocument()
  })

  it('TC-15-03: shows per-group average per month stat', () => {
    render(<AnnualSummary {...baseProps} />)
    // groupNames.g1 = 'Housing', label = 'Housing avg/mo'
    expect(screen.getByText(/housing avg\/mo/i)).toBeInTheDocument()
  })

  it('TC-15-08: renders "Breakdown by group" matrix section', () => {
    render(<AnnualSummary {...baseProps} />)
    expect(screen.getByText(/breakdown by group/i)).toBeInTheDocument()
  })

  it('TC-15-08: matrix table shows group name as a row', () => {
    render(<AnnualSummary {...baseProps} />)
    // 'Housing' appears in the matrix table row header
    expect(screen.getByText('Housing')).toBeInTheDocument()
  })

  it('TC-15-08: matrix table column headers include Jan and Dec', () => {
    render(<AnnualSummary {...baseProps} />)
    expect(screen.getByText('Jan')).toBeInTheDocument()
    expect(screen.getByText('Dec')).toBeInTheDocument()
  })

  it('TC-15-11: renders monthly spend chart section heading', () => {
    render(<AnnualSummary {...baseProps} />)
    expect(screen.getByText(/monthly spend/i)).toBeInTheDocument()
  })

  it('TC-15-11: renders the recharts container for the trend chart', () => {
    render(<AnnualSummary {...baseProps} />)
    expect(screen.getByTestId('recharts-container')).toBeInTheDocument()
  })

  it('shows empty state when annualTotal is zero', () => {
    render(<AnnualSummary {...baseProps} annualTotal={0} />)
    expect(screen.getByText(/no expenses recorded for 2025/i)).toBeInTheDocument()
  })
})
