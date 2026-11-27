import { describe, it, expect } from 'vitest'
import { allocateShares } from '@/lib/split'

const amounts = (...args: Parameters<typeof allocateShares>) => allocateShares(...args).map((s) => s.amount)
const three = [
  { personId: 'a', bps: 3333 },
  { personId: 'b', bps: 3333 },
  { personId: 'c', bps: 3334 },
]
const cents = (value: string) => BigInt(value.replace('.', ''))

describe('allocateShares', () => {
  it('splits an even amount 50/50', () => {
    expect(allocateShares('10000.00', [{ personId: 'a', bps: 5000 }, { personId: 'b', bps: 5000 }], 'b')).toEqual([
      { personId: 'a', bps: 5000, amount: '5000.00' },
      { personId: 'b', bps: 5000, amount: '5000.00' },
    ])
  })

  it('TC-19-01: gives the leftover cent to the highest remainder (Example B)', () => {
    expect(amounts('100.01', [{ personId: 'a', bps: 6000 }, { personId: 'b', bps: 4000 }], 'b')).toEqual(['60.01', '40.00'])
  })

  it('TC-19-02: breaks remainder ties with the payer first (Example C)', () => {
    expect(amounts('90.00', three, 'a')).toEqual(['30.00', '30.00', '30.00'])
    expect(amounts('0.01', three.slice(0, 2).map((s) => ({ ...s, bps: 5000 })), 'b')).toEqual(['0.00', '0.01'])
  })

  it('TC-19-02: after the payer, ties follow the given (creation) order', () => {
    const half = [{ personId: 'a', bps: 5000 }, { personId: 'b', bps: 5000 }]
    expect(amounts('0.01', half, 'someone-else')).toEqual(['0.01', '0.00'])
  })

  it('has no leftover when the division is exact', () => {
    expect(amounts('300.00', three, 'c')).toEqual(['99.99', '99.99', '100.02'])
  })

  it.each(['0.01', '0.02', '0.03', '100', '361.6', '9999999999.99'])(
    'TC-19-01: shares of %s add up exactly',
    (amount) => {
      const total = allocateShares(amount, three, 'b').reduce((sum, s) => sum + cents(s.amount), BigInt(0))
      const [whole, fraction = ''] = amount.split('.')
      expect(total).toBe(BigInt(whole + fraction.padEnd(2, '0')))
    },
  )

  it('never gives a cent to a 0% share', () => {
    expect(amounts('0.01', [{ personId: 'a', bps: 0 }, { personId: 'b', bps: 10000 }], 'a')).toEqual(['0.00', '0.01'])
  })
})
