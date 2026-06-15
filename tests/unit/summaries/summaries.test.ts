import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  calcMonthlyBreakdown,
  elapsedMonths,
  calcGroupAverages,
  buildMatrix,
  calcMonthTotals,
} from '@/lib/summaries'

// TC-14-04/05/06/07/08 and TC-15-04/05/06/07/09/10

describe('calcMonthlyBreakdown', () => {
  it('returns [] when total is zero', () => {
    expect(calcMonthlyBreakdown([])).toEqual([])
  })

  it('single group = 100%', () => {
    const rows = [
      { groupId: 'g1', groupName: 'Food', amount: '200.00' },
      { groupId: 'g1', groupName: 'Food', amount: '100.00' },
    ]
    const result = calcMonthlyBreakdown(rows)
    expect(result).toHaveLength(1)
    expect(result[0].subtotal).toBe(300)
    expect(result[0].pct).toBe(100)
  })

  it('two groups sum pcts to exactly 100', () => {
    const rows = [
      { groupId: 'g1', groupName: 'Food', amount: '100.00' },
      { groupId: 'g2', groupName: 'Transport', amount: '200.00' },
    ]
    const result = calcMonthlyBreakdown(rows)
    const total = result.reduce((s, g) => s + g.pct, 0)
    expect(total).toBe(100)
  })

  it('three-way even split sums to exactly 100', () => {
    const rows = [
      { groupId: 'g1', groupName: 'A', amount: '1.00' },
      { groupId: 'g2', groupName: 'B', amount: '1.00' },
      { groupId: 'g3', groupName: 'C', amount: '1.00' },
    ]
    const result = calcMonthlyBreakdown(rows)
    const total = result.reduce((s, g) => s + g.pct, 0)
    expect(total).toBe(100)
  })

  it('multi-group rounding — last group absorbs error', () => {
    // 1/3 ≈ 33.3% each
    const rows = [
      { groupId: 'g1', groupName: 'A', amount: '100.00' },
      { groupId: 'g2', groupName: 'B', amount: '100.00' },
      { groupId: 'g3', groupName: 'C', amount: '100.00' },
    ]
    const result = calcMonthlyBreakdown(rows)
    const total = result.reduce((s, g) => s + g.pct, 0)
    expect(total).toBe(100)
    result.forEach((g) => {
      expect(Number.isFinite(g.pct)).toBe(true)
    })
  })
})

describe('elapsedMonths', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('past year returns 12', () => {
    expect(elapsedMonths(2020)).toBe(12)
  })

  it('current year with month=March returns 3', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15)) // March 2026
    expect(elapsedMonths(2026)).toBe(3)
  })

  it('January edge case returns 1, never 0', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1)) // January 2026
    expect(elapsedMonths(2026)).toBe(1)
  })
})

describe('calcGroupAverages', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('past year divides by 12', () => {
    const result = calcGroupAverages({ g1: 1200 }, 2020)
    expect(result.g1).toBe(100)
  })

  it('current year divides by elapsed months', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15)) // March 2026 → 3 elapsed months
    const result = calcGroupAverages({ g1: 300 }, 2026)
    expect(result.g1).toBeCloseTo(100) // 300 / 3
  })
})

describe('buildMatrix', () => {
  it('zero-fills all 12 months per group', () => {
    const rows = [{ groupId: 'g1', groupName: 'Food', month: 3, amount: '50.00' }]
    const matrix = buildMatrix(rows, 2026)
    expect(Object.keys(matrix.g1)).toHaveLength(12)
    for (let m = 1; m <= 12; m++) {
      expect(typeof matrix.g1[m]).toBe('number')
    }
    expect(matrix.g1[3]).toBe(50)
    expect(matrix.g1[1]).toBe(0)
  })

  it('multiple groups each get all 12 months', () => {
    const rows = [
      { groupId: 'g1', groupName: 'Food', month: 1, amount: '100.00' },
      { groupId: 'g2', groupName: 'Transport', month: 6, amount: '200.00' },
    ]
    const matrix = buildMatrix(rows, 2026)
    expect(Object.keys(matrix)).toHaveLength(2)
    for (let m = 1; m <= 12; m++) {
      expect(typeof matrix.g1[m]).toBe('number')
      expect(typeof matrix.g2[m]).toBe('number')
    }
    expect(matrix.g1[1]).toBe(100)
    expect(matrix.g2[6]).toBe(200)
    expect(matrix.g1[6]).toBe(0)
    expect(matrix.g2[1]).toBe(0)
  })

  it('sums multiple rows in same group+month', () => {
    const rows = [
      { groupId: 'g1', groupName: 'Food', month: 5, amount: '100.00' },
      { groupId: 'g1', groupName: 'Food', month: 5, amount: '50.00' },
    ]
    const matrix = buildMatrix(rows, 2026)
    expect(matrix.g1[5]).toBe(150)
  })
})

describe('calcMonthTotals', () => {
  it('sums all groups per month column', () => {
    const matrix = {
      g1: { 1: 100, 2: 0, 3: 50, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
      g2: { 1: 200, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
    }
    const totals = calcMonthTotals(matrix)
    expect(totals[1]).toBe(300)
    expect(totals[3]).toBe(50)
    expect(totals[2]).toBe(0)
  })

  it('zero months stay zero', () => {
    const matrix = {
      g1: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
    }
    const totals = calcMonthTotals(matrix)
    for (let m = 1; m <= 12; m++) {
      expect(totals[m]).toBe(0)
    }
  })
})
