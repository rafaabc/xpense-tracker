import { describe, it, expect } from 'vitest'
import { validateAmount } from '@/lib/validations/expenses'

// TC-10-06: Amount must be strictly > 0.00
// TC-10-07: Amount accepts up to 2 decimal places
// TC-10-08: Amount with > 2 decimals rejected
// TC-10-09: Non-numeric Amount rejected
// TC-10-10: Amount = 0 or negative rejected
// TC-12-02: Same rules apply on edit

describe('validateAmount', () => {
  // --- valid cases ---
  it('TC-10-06/07: accepts integer amount', () => {
    expect(validateAmount('100')).toEqual({ ok: true })
  })

  it('TC-10-07: accepts 1 decimal place', () => {
    expect(validateAmount('9.5')).toEqual({ ok: true })
  })

  it('TC-10-07: accepts 2 decimal places', () => {
    expect(validateAmount('12.99')).toEqual({ ok: true })
  })

  it('TC-10-06: accepts minimum valid amount 0.01', () => {
    expect(validateAmount('0.01')).toEqual({ ok: true })
  })

  it('accepts large valid amount', () => {
    expect(validateAmount('999999.99')).toEqual({ ok: true })
  })

  it('trims whitespace before validating', () => {
    expect(validateAmount('  10.00  ')).toEqual({ ok: true })
  })

  // --- invalid: zero / negative ---
  it('TC-10-10: rejects zero', () => {
    const r = validateAmount('0')
    expect(r.ok).toBe(false)
    expect((r as { ok: false; error: string }).error).toBeTruthy()
  })

  it('TC-10-10: rejects 0.00', () => {
    expect(validateAmount('0.00').ok).toBe(false)
  })

  it('TC-10-10: rejects negative amount', () => {
    expect(validateAmount('-1').ok).toBe(false)
  })

  it('TC-10-10: rejects negative decimal', () => {
    expect(validateAmount('-0.01').ok).toBe(false)
  })

  // --- invalid: too many decimals ---
  it('TC-10-08: rejects 3 decimal places', () => {
    expect(validateAmount('1.001').ok).toBe(false)
  })

  it('TC-10-08: rejects many decimal places', () => {
    expect(validateAmount('1.12345').ok).toBe(false)
  })

  // --- invalid: non-numeric ---
  it('TC-10-09: rejects empty string', () => {
    expect(validateAmount('').ok).toBe(false)
  })

  it('TC-10-09: rejects whitespace-only', () => {
    expect(validateAmount('   ').ok).toBe(false)
  })

  it('TC-10-09: rejects alphabetic input', () => {
    expect(validateAmount('abc').ok).toBe(false)
  })

  it('TC-10-09: rejects mixed alphanumeric', () => {
    expect(validateAmount('12abc').ok).toBe(false)
  })

  it('TC-10-09: rejects comma as decimal separator', () => {
    expect(validateAmount('1,00').ok).toBe(false)
  })

  it('TC-10-09: rejects NaN string', () => {
    expect(validateAmount('NaN').ok).toBe(false)
  })
})
