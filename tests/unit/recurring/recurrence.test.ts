import { describe, it, expect } from 'vitest'
import {
  clampDayOfMonth,
  addInterval,
  occurrencesDue,
  nextExecutionDate,
  renewalDueDate,
  isRenewalDue,
  buildSuccessor,
  INTERVALS,
  type RecurringTemplate,
} from '@/lib/recurrence'

// ─── clampDayOfMonth ────────────────────────────────────────────────────────

describe('clampDayOfMonth', () => {
  it('returns the day when it exists in the month', () => {
    expect(clampDayOfMonth(2024, 1, 15)).toBe(15)
  })

  it('clamps day 31 to 30 in a 30-day month (TC-08-04)', () => {
    expect(clampDayOfMonth(2024, 4, 31)).toBe(30) // April has 30 days
  })

  it('clamps day 31 to 28 in February non-leap (TC-08-04)', () => {
    expect(clampDayOfMonth(2025, 2, 31)).toBe(28)
  })

  it('clamps day 31 to 29 in February leap year (TC-08-04)', () => {
    expect(clampDayOfMonth(2024, 2, 31)).toBe(29)
  })

  it('returns day 28 unchanged in February non-leap', () => {
    expect(clampDayOfMonth(2025, 2, 28)).toBe(28)
  })

  it('clamps day 30 to 28 in February non-leap', () => {
    expect(clampDayOfMonth(2025, 2, 30)).toBe(28)
  })

  it('returns 31 for December', () => {
    expect(clampDayOfMonth(2024, 12, 31)).toBe(31)
  })
})

// ─── addInterval ────────────────────────────────────────────────────────────

describe('addInterval', () => {
  it('adds 1 month (monthly)', () => {
    expect(addInterval({ year: 2024, month: 1 }, 'monthly')).toEqual({ year: 2024, month: 2 })
  })

  it('wraps year correctly when adding 1 month from December', () => {
    expect(addInterval({ year: 2024, month: 12 }, 'monthly')).toEqual({ year: 2025, month: 1 })
  })

  it('adds 6 months', () => {
    expect(addInterval({ year: 2024, month: 1 }, '6mo')).toEqual({ year: 2024, month: 7 })
  })

  it('wraps year when adding 6 months crosses year boundary', () => {
    expect(addInterval({ year: 2024, month: 8 }, '6mo')).toEqual({ year: 2025, month: 2 })
  })

  it('adds 12 months (annual)', () => {
    expect(addInterval({ year: 2024, month: 3 }, '12mo')).toEqual({ year: 2025, month: 3 })
  })
})

// ─── INTERVALS ──────────────────────────────────────────────────────────────

describe('INTERVALS', () => {
  it('supports monthly, 6mo, and 12mo (TC-08-02)', () => {
    const keys = Object.keys(INTERVALS)
    expect(keys).toContain('monthly')
    expect(keys).toContain('6mo')
    expect(keys).toContain('12mo')
  })

  it('has a label and monthCount for each interval', () => {
    for (const iv of Object.values(INTERVALS)) {
      expect(typeof iv.label).toBe('string')
      expect(typeof iv.monthCount).toBe('number')
    }
  })

  it('monthCount values are 1, 6, 12', () => {
    expect(INTERVALS['monthly'].monthCount).toBe(1)
    expect(INTERVALS['6mo'].monthCount).toBe(6)
    expect(INTERVALS['12mo'].monthCount).toBe(12)
  })
})

// ─── occurrencesDue ─────────────────────────────────────────────────────────

function makeTemplate(overrides: Partial<RecurringTemplate> = {}): RecurringTemplate {
  return {
    id: 'tmpl-1',
    userId: 'user-1',
    subcategoryId: 'sub-1',
    amount: '500.00',
    startDate: '2024-01-15',
    interval: 'monthly',
    dayOfMonth: 15,
    active: true,
    lastRenewedAt: null,
    lastGeneratedDate: null,
    ...overrides,
  }
}

describe('occurrencesDue', () => {
  it('returns empty array when startDate is in the future', () => {
    const tmpl = makeTemplate({ startDate: '2030-01-15', dayOfMonth: 15 })
    expect(occurrencesDue(tmpl, '2024-06-15')).toEqual([])
  })

  it('returns one occurrence when startDate is today', () => {
    const tmpl = makeTemplate({ startDate: '2024-06-15', dayOfMonth: 15, interval: 'monthly' })
    expect(occurrencesDue(tmpl, '2024-06-15')).toEqual(['2024-06-15'])
  })

  it('returns multiple monthly occurrences since startDate', () => {
    const tmpl = makeTemplate({ startDate: '2024-01-10', dayOfMonth: 10, interval: 'monthly' })
    const result = occurrencesDue(tmpl, '2024-03-10')
    expect(result).toEqual(['2024-01-10', '2024-02-10', '2024-03-10'])
  })

  it('returns only occurrences after lastGeneratedDate (idempotency)', () => {
    const tmpl = makeTemplate({
      startDate: '2024-01-10',
      dayOfMonth: 10,
      interval: 'monthly',
      lastGeneratedDate: '2024-01-10',
    })
    const result = occurrencesDue(tmpl, '2024-03-10')
    expect(result).toEqual(['2024-02-10', '2024-03-10'])
  })

  it('returns empty when all occurrences already generated', () => {
    const tmpl = makeTemplate({
      startDate: '2024-01-10',
      dayOfMonth: 10,
      interval: 'monthly',
      lastGeneratedDate: '2024-03-10',
    })
    expect(occurrencesDue(tmpl, '2024-03-10')).toEqual([])
  })

  it('clamps day-of-month overflow in short months (TC-08-04)', () => {
    // dayOfMonth 31, monthly from Jan — Feb should clamp to 28
    const tmpl = makeTemplate({ startDate: '2025-01-31', dayOfMonth: 31, interval: 'monthly' })
    const result = occurrencesDue(tmpl, '2025-03-31')
    expect(result).toContain('2025-01-31')
    expect(result).toContain('2025-02-28')
    expect(result).toContain('2025-03-31')
  })

  it('6-month interval generates every 6 months', () => {
    const tmpl = makeTemplate({ startDate: '2024-01-15', dayOfMonth: 15, interval: '6mo' })
    const result = occurrencesDue(tmpl, '2025-01-15')
    expect(result).toEqual(['2024-01-15', '2024-07-15', '2025-01-15'])
  })

  it('12-month interval generates once per year', () => {
    const tmpl = makeTemplate({ startDate: '2024-01-15', dayOfMonth: 15, interval: '12mo' })
    const result = occurrencesDue(tmpl, '2025-01-15')
    expect(result).toEqual(['2024-01-15', '2025-01-15'])
  })

  it('does not emit occurrence before startDate even if interval would align (TC-08-10/11)', () => {
    // Template created 2024-03-15, monthly. Day 15. If we edit to start at 2024-03-15,
    // 2024-01-15 and 2024-02-15 should NOT appear.
    const tmpl = makeTemplate({ startDate: '2024-03-15', dayOfMonth: 15, interval: 'monthly' })
    const result = occurrencesDue(tmpl, '2024-05-15')
    expect(result).toEqual(['2024-03-15', '2024-04-15', '2024-05-15'])
    expect(result).not.toContain('2024-01-15')
    expect(result).not.toContain('2024-02-15')
  })
})

// ─── nextExecutionDate ──────────────────────────────────────────────────────

describe('nextExecutionDate', () => {
  it('returns the first un-generated future occurrence', () => {
    const tmpl = makeTemplate({
      startDate: '2024-01-15',
      dayOfMonth: 15,
      interval: 'monthly',
      lastGeneratedDate: '2024-05-15',
    })
    expect(nextExecutionDate(tmpl, '2024-05-20')).toBe('2024-06-15')
  })

  it('returns next cycle when today is after lastGenerated by less than one cycle', () => {
    const tmpl = makeTemplate({
      startDate: '2024-01-15',
      dayOfMonth: 15,
      interval: 'monthly',
      lastGeneratedDate: '2024-06-15',
    })
    expect(nextExecutionDate(tmpl, '2024-06-15')).toBe('2024-07-15')
  })

  it('returns startDate as next execution when template has no generated date yet', () => {
    const tmpl = makeTemplate({ startDate: '2024-07-15', dayOfMonth: 15, interval: 'monthly' })
    expect(nextExecutionDate(tmpl, '2024-06-01')).toBe('2024-07-15')
  })
})

// ─── renewalDueDate ─────────────────────────────────────────────────────────

describe('renewalDueDate', () => {
  it('returns startDate + 12 months when never renewed', () => {
    const tmpl = makeTemplate({ startDate: '2024-01-15', lastRenewedAt: null })
    expect(renewalDueDate(tmpl)).toBe('2025-01-15')
  })

  it('returns lastRenewedAt + 12 months after renewal (TC-09-01/02)', () => {
    const tmpl = makeTemplate({ startDate: '2024-01-15', lastRenewedAt: '2025-01-15' })
    expect(renewalDueDate(tmpl)).toBe('2026-01-15')
  })
})

// ─── isRenewalDue ───────────────────────────────────────────────────────────

describe('isRenewalDue', () => {
  it('returns true when today is on the renewal date', () => {
    const tmpl = makeTemplate({ startDate: '2024-01-15', lastRenewedAt: null })
    expect(isRenewalDue(tmpl, '2025-01-15')).toBe(true)
  })

  it('returns true when today is past the renewal date', () => {
    const tmpl = makeTemplate({ startDate: '2024-01-15', lastRenewedAt: null })
    expect(isRenewalDue(tmpl, '2025-06-01')).toBe(true)
  })

  it('returns false when renewal date is in the future', () => {
    const tmpl = makeTemplate({ startDate: '2024-01-15', lastRenewedAt: null })
    expect(isRenewalDue(tmpl, '2024-12-31')).toBe(false)
  })

  it('uses lastRenewedAt as anchor when present (TC-09-02)', () => {
    const tmpl = makeTemplate({ startDate: '2024-01-15', lastRenewedAt: '2025-01-15' })
    expect(isRenewalDue(tmpl, '2025-06-01')).toBe(false) // renewal not due until 2026-01-15
    expect(isRenewalDue(tmpl, '2026-01-15')).toBe(true)
  })
})

// ─── buildSuccessor ─────────────────────────────────────────────────────────

describe('buildSuccessor', () => {
  it('copies interval and dayOfMonth from source template (TC-09-08)', () => {
    const tmpl = makeTemplate({ interval: '6mo', dayOfMonth: 15, startDate: '2024-01-15' })
    const succ = buildSuccessor(tmpl, '750.00')
    expect(succ.interval).toBe('6mo')
    expect(succ.dayOfMonth).toBe(15)
  })

  it('uses the new amount (TC-09-07)', () => {
    const tmpl = makeTemplate({ amount: '500.00' })
    const succ = buildSuccessor(tmpl, '750.00')
    expect(succ.amount).toBe('750.00')
  })

  it('carries over subcategoryId and userId', () => {
    const tmpl = makeTemplate({ subcategoryId: 'sub-99', userId: 'u-42' })
    const succ = buildSuccessor(tmpl, '100.00')
    expect(succ.subcategoryId).toBe('sub-99')
    expect(succ.userId).toBe('u-42')
  })

  it('sets startDate to the renewal due date for continuity', () => {
    const tmpl = makeTemplate({ startDate: '2024-01-15', lastRenewedAt: null })
    const succ = buildSuccessor(tmpl, '100.00')
    // Successor starts where the renewal is due
    expect(succ.startDate).toBe('2025-01-15')
  })

  it('carries over lastGeneratedDate for seamless continuation', () => {
    const tmpl = makeTemplate({ lastGeneratedDate: '2024-12-15' })
    const succ = buildSuccessor(tmpl, '100.00')
    expect(succ.lastGeneratedDate).toBe('2024-12-15')
  })
})
