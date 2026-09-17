import { describe, it, expect } from 'vitest'
import { validateAmount } from '@/lib/validations/expenses'

// TC-10-06: Amount must be strictly > 0.00
// TC-10-07: Amount accepts up to 2 decimal places
// TC-10-08: Amount with > 2 decimals rejected
// TC-10-09: Non-numeric Amount rejected; comma decimal separator accepted and normalized
// TC-10-10: Amount = 0 or negative rejected
// TC-12-02: Same rules apply on edit

describe('validateAmount', () => {
  // --- valid cases ---
  it('TC-10-06/07: accepts integer amount', () => {
    expect(validateAmount('100')).toEqual({ ok: true, value: '100' })
  })

  it('TC-10-07: accepts 1 decimal place', () => {
    expect(validateAmount('9.5')).toEqual({ ok: true, value: '9.5' })
  })

  it('TC-10-07: accepts 2 decimal places', () => {
    expect(validateAmount('12.99')).toEqual({ ok: true, value: '12.99' })
  })

  it('TC-10-06: accepts minimum valid amount 0.01', () => {
    expect(validateAmount('0.01')).toEqual({ ok: true, value: '0.01' })
  })

  it('accepts large valid amount', () => {
    expect(validateAmount('999999.99')).toEqual({ ok: true, value: '999999.99' })
  })

  it('trims whitespace before validating', () => {
    expect(validateAmount('  10.00  ')).toEqual({ ok: true, value: '10.00' })
  })

  // --- valid: comma decimal separator (DKK/BRL keyboards) ---
  it('TC-10-09: accepts comma as decimal separator and normalizes to dot', () => {
    expect(validateAmount('361,61')).toEqual({ ok: true, value: '361.61' })
  })

  it('accepts comma with 1 decimal place', () => {
    expect(validateAmount('9,5')).toEqual({ ok: true, value: '9.5' })
  })

  it('accepts dot-thousands + comma-decimal (1.361,61)', () => {
    expect(validateAmount('1.361,61')).toEqual({ ok: true, value: '1361.61' })
  })

  it('accepts comma-thousands + dot-decimal (1,361.61)', () => {
    expect(validateAmount('1,361.61')).toEqual({ ok: true, value: '1361.61' })
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

  it('TC-10-09: rejects NaN string', () => {
    expect(validateAmount('NaN').ok).toBe(false)
  })

  // --- invalid: ambiguous comma grouping ---
  it('rejects comma followed by 3 digits (ambiguous thousands vs decimals)', () => {
    expect(validateAmount('1,000').ok).toBe(false)
  })

  it('rejects comma followed by more than 2 digits', () => {
    expect(validateAmount('1,2345').ok).toBe(false)
  })

  it('rejects multiple bare commas', () => {
    expect(validateAmount('1,2,3').ok).toBe(false)
  })

  it('rejects malformed thousands grouping with comma decimal', () => {
    expect(validateAmount('12.3.456,61').ok).toBe(false)
  })
})
