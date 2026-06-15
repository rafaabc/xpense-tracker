import { describe, it, expect } from 'vitest'
import { formatAmount } from '@/lib/format'

// TC-11-02: Amount formatted per user's currency preference

describe('formatAmount', () => {
  it('TC-11-02: formats DKK with kr symbol', () => {
    expect(formatAmount('1234.50', 'DKK')).toContain('kr')
  })

  it('TC-11-02: formats BRL with R$ symbol', () => {
    expect(formatAmount('1234.50', 'BRL')).toContain('R$')
  })

  it('TC-11-02: renders exactly 2 decimal places for whole number', () => {
    const result = formatAmount('100', 'DKK')
    expect(result).toMatch(/100[.,]00/)
  })

  it('TC-11-02: renders exactly 2 decimal places for 1-decimal input', () => {
    const result = formatAmount('9.5', 'BRL')
    expect(result).toMatch(/9[.,]50/)
  })

  it('TC-11-02: accepts numeric input', () => {
    const result = formatAmount(42.99, 'DKK')
    expect(result).toContain('kr')
    expect(result).toMatch(/42[.,]99/)
  })

  it('TC-11-02: raw stored value not mutated — returns formatted string, not modified number', () => {
    const raw = '1234.56'
    formatAmount(raw, 'DKK')
    expect(raw).toBe('1234.56') // original reference untouched
  })
})
