import { describe, it, expect } from 'vitest'
import { validateExpenseDate } from '@/lib/validations/expenses'

// TC-10-04: Future date rejected
// TC-10-05: Past dates of any age accepted
// TC-12-03: Same rules apply on edit

describe('validateExpenseDate', () => {
  const TODAY = '2026-06-15'

  // --- valid cases ---
  it('TC-10-05: accepts today', () => {
    expect(validateExpenseDate(TODAY, TODAY)).toEqual({ ok: true })
  })

  it('TC-10-05: accepts yesterday', () => {
    expect(validateExpenseDate('2026-06-14', TODAY)).toEqual({ ok: true })
  })

  it('TC-10-05: accepts old past date', () => {
    expect(validateExpenseDate('2015-01-01', TODAY)).toEqual({ ok: true })
  })

  it('TC-10-05: accepts start of year', () => {
    expect(validateExpenseDate('2026-01-01', TODAY)).toEqual({ ok: true })
  })

  // --- invalid: future ---
  it('TC-10-04: rejects tomorrow', () => {
    const r = validateExpenseDate('2026-06-16', TODAY)
    expect(r.ok).toBe(false)
    expect((r as { ok: false; error: string }).error).toBeTruthy()
  })

  it('TC-10-04: rejects far-future date', () => {
    expect(validateExpenseDate('2099-12-31', TODAY).ok).toBe(false)
  })

  // --- invalid: malformed ---
  it('rejects empty string', () => {
    expect(validateExpenseDate('', TODAY).ok).toBe(false)
  })

  it('rejects non-date string', () => {
    expect(validateExpenseDate('not-a-date', TODAY).ok).toBe(false)
  })
})
