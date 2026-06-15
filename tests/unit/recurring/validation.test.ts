import { describe, it, expect } from 'vitest'
import {
  validateDayOfMonth,
  validateInterval,
  validateStartDate,
} from '@/lib/validations/recurring'

// TC-08-01: required fields for recurring setup

describe('validateDayOfMonth', () => {
  it('rejects empty input', () => {
    const r = validateDayOfMonth('')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/required/i)
  })

  it('accepts 1 (minimum)', () => {
    expect(validateDayOfMonth('1').ok).toBe(true)
  })

  it('accepts 31 (maximum)', () => {
    expect(validateDayOfMonth('31').ok).toBe(true)
  })

  it('rejects 0', () => {
    const r = validateDayOfMonth('0')
    expect(r.ok).toBe(false)
  })

  it('rejects 32', () => {
    const r = validateDayOfMonth('32')
    expect(r.ok).toBe(false)
  })

  it('rejects non-integer (1.5)', () => {
    expect(validateDayOfMonth('1.5').ok).toBe(false)
  })

  it('rejects non-numeric', () => {
    expect(validateDayOfMonth('abc').ok).toBe(false)
  })

  it('accepts 15', () => {
    expect(validateDayOfMonth('15').ok).toBe(true)
  })
})

describe('validateInterval', () => {
  it('accepts monthly (TC-08-02)', () => {
    expect(validateInterval('monthly').ok).toBe(true)
  })

  it('accepts 6mo (TC-08-02)', () => {
    expect(validateInterval('6mo').ok).toBe(true)
  })

  it('accepts 12mo (TC-08-02)', () => {
    expect(validateInterval('12mo').ok).toBe(true)
  })

  it('rejects empty string', () => {
    const r = validateInterval('')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/required/i)
  })

  it('rejects unknown interval', () => {
    expect(validateInterval('weekly').ok).toBe(false)
  })

  it('rejects arbitrary string', () => {
    expect(validateInterval('biweekly').ok).toBe(false)
  })
})

describe('validateStartDate', () => {
  it('accepts valid YYYY-MM-DD date', () => {
    expect(validateStartDate('2024-06-15').ok).toBe(true)
  })

  it('accepts future date (generation waits until the date passes)', () => {
    expect(validateStartDate('2099-12-31').ok).toBe(true)
  })

  it('accepts past date', () => {
    expect(validateStartDate('2020-01-01').ok).toBe(true)
  })

  it('rejects empty string', () => {
    const r = validateStartDate('')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/required/i)
  })

  it('rejects malformed date (YYYY/MM/DD)', () => {
    expect(validateStartDate('2024/06/15').ok).toBe(false)
  })

  it('rejects partial date', () => {
    expect(validateStartDate('2024-06').ok).toBe(false)
  })

  it('rejects non-date string', () => {
    expect(validateStartDate('today').ok).toBe(false)
  })
})
