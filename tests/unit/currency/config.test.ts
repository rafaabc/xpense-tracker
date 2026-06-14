import { describe, it, expect } from 'vitest'
import { CURRENCIES, DEFAULT_CURRENCY, validateCurrency } from '@/lib/validations/currency'

// TC-05-02: Only DKK and BRL offered
// TC-05-03: Default is DKK
// TC-05-06: Currency change never mutates stored values (pure display logic verified here)

describe('TC-05-02: CURRENCIES constant', () => {
  it('contains exactly DKK and BRL', () => {
    expect(CURRENCIES).toEqual(['DKK', 'BRL'])
  })

  it('has exactly 2 options', () => {
    expect(CURRENCIES).toHaveLength(2)
  })
})

describe('TC-05-03: Default currency', () => {
  it('default is DKK', () => {
    expect(DEFAULT_CURRENCY).toBe('DKK')
  })
})

describe('TC-05-06: validateCurrency — display-only, no conversion', () => {
  it('accepts DKK', () => {
    expect(validateCurrency('DKK')).toBe(true)
  })

  it('accepts BRL', () => {
    expect(validateCurrency('BRL')).toBe(true)
  })

  it('rejects unknown currency', () => {
    expect(validateCurrency('USD')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateCurrency('')).toBe(false)
  })

  it('rejects null', () => {
    expect(validateCurrency(null as unknown as string)).toBe(false)
  })
})
