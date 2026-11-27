import { describe, it, expect } from 'vitest'
import { validatePersonName, parsePercentToBps, validateSplitTotal, formatBps } from '@/lib/validations/people'

describe('validatePersonName', () => {
  it('TC-16-02: accepts a normal name and trims it', () => {
    expect(validatePersonName('  Ana ')).toEqual({ ok: true, value: 'Ana' })
  })

  it.each(['', '   '])('TC-16-02: rejects empty or whitespace name %j', (name) => {
    expect(validatePersonName(name)).toEqual({ ok: false, error: 'Name is required' })
  })

  it('TC-16-02: accepts 50 characters', () => {
    expect(validatePersonName('a'.repeat(50)).ok).toBe(true)
  })

  it('TC-16-02: rejects 51 characters', () => {
    expect(validatePersonName('a'.repeat(51))).toEqual({ ok: false, error: 'Name must be 50 characters or fewer' })
  })
})

describe('parsePercentToBps', () => {
  it.each([
    ['0', 0],
    ['50', 5000],
    ['33.33', 3333],
    ['33,33', 3333],
    ['0.5', 50],
    [' 100 ', 10000],
    ['100.00', 10000],
  ])('TC-17-01: parses %j as %i basis points', (input, bps) => {
    expect(parsePercentToBps(input)).toEqual({ ok: true, value: bps })
  })

  it.each(['', '33.333', '-1', '100.01', '101', 'abc', '1e2', '1,000.00'])('TC-17-01: rejects %j', (input) => {
    expect(parsePercentToBps(input).ok).toBe(false)
  })
})

describe('validateSplitTotal', () => {
  it('TC-17-02: accepts a total of exactly 100.00', () => {
    expect(validateSplitTotal([3333, 3333, 3334])).toEqual({ ok: true })
  })

  it.each([[[5000, 4999]], [[5000, 5001]]])('TC-17-02: rejects total %j', (shares) => {
    expect(validateSplitTotal(shares)).toEqual({ ok: false, error: 'Percentages must add up to 100' })
  })

  it('TC-17-03: rejects an all-zero split', () => {
    expect(validateSplitTotal([0, 0]).ok).toBe(false)
  })

  it('rejects values that are not integers between 0 and 10000', () => {
    expect(validateSplitTotal([-1, 10001]).ok).toBe(false)
    expect(validateSplitTotal([5000.5, 4999.5]).ok).toBe(false)
  })
})

describe('formatBps', () => {
  it.each([[5000, '50'], [3333, '33.33'], [50, '0.5'], [0, '0'], [10000, '100']])(
    'formats %i as %j',
    (bps, text) => {
      expect(formatBps(bps)).toBe(text)
    },
  )
})
