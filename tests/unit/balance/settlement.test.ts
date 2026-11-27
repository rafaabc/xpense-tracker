import { describe, it, expect } from 'vitest'
import { calcBalances, calcTransfers, type BalanceExpense } from '@/lib/settlement'

const you = { id: 'you', isSelf: true }
const ana = { id: 'ana', isSelf: false }
const bo = { id: 'bo', isSelf: false }

const split = (amount: string, payer: string, shares: Record<string, string>): BalanceExpense => ({
  amount,
  payerPersonId: payer,
  splitMode: 'split',
  shares: Object.entries(shares).map(([personId, value]) => ({ personId, amount: value })),
})
const personal = (amount: string, payer: string | null): BalanceExpense => ({
  amount,
  payerPersonId: payer,
  splitMode: 'personal',
  shares: [],
})

const exampleA = [
  split('10000.00', 'ana', { you: '5000.00', ana: '5000.00' }),
  split('3000.00', 'you', { you: '1500.00', ana: '1500.00' }),
  split('500.00', 'you', { you: '250.00', ana: '250.00' }),
  personal('200.00', 'you'),
]

describe('calcBalances', () => {
  it('TC-20-01: computes paid, share and net (Example A)', () => {
    expect(calcBalances([you, ana], exampleA)).toEqual([
      { personId: 'you', paid: '3700.00', share: '6950.00', net: '-3250.00' },
      { personId: 'ana', paid: '10000.00', share: '6750.00', net: '3250.00' },
    ])
  })

  it('TC-20-05: personal expenses do not change nets', () => {
    const nets = calcBalances([you, ana], [personal('200.00', 'you'), personal('80.50', 'ana')]).map((b) => b.net)
    expect(nets).toEqual(['0.00', '0.00'])
  })

  it('TC-18-04: reads a missing payer as self', () => {
    expect(calcBalances([ana, you], [personal('10.00', null)])).toEqual([
      { personId: 'ana', paid: '0.00', share: '0.00', net: '0.00' },
      { personId: 'you', paid: '10.00', share: '10.00', net: '0.00' },
    ])
  })

  it('TC-20-02: nets add up to zero', () => {
    const expenses = Array.from({ length: 200 }, (_, i) => {
      const cents = 3 + ((i * 7919) % 100000)
      const third = Math.floor(cents / 3)
      const money = (c: number) => (c / 100).toFixed(2)
      return split(money(cents), ['you', 'ana', 'bo'][i % 3], {
        you: money(third),
        ana: money(third),
        bo: money(cents - 2 * third),
      })
    })
    const total = calcBalances([you, ana, bo], expenses).reduce((sum, b) => sum + Number(b.net.replace('.', '')), 0)
    expect(total).toBe(0)
  })
})

describe('calcTransfers', () => {
  const nets = (values: Record<string, string>) =>
    Object.entries(values).map(([personId, net]) => ({ personId, paid: '0.00', share: '0.00', net }))

  it('TC-20-03: two people need one transfer (Example A)', () => {
    expect(calcTransfers(calcBalances([you, ana], exampleA))).toEqual([{ from: 'you', to: 'ana', amount: '3250.00' }])
  })

  it('TC-20-03: three people need two transfers, largest debtor first (Example C)', () => {
    const expenses = [
      split('90.00', 'you', { you: '30.00', ana: '30.00', bo: '30.00' }),
      split('300.00', 'bo', { you: '99.99', ana: '99.99', bo: '100.02' }),
    ]
    expect(calcTransfers(calcBalances([you, ana, bo], expenses))).toEqual([
      { from: 'ana', to: 'bo', amount: '129.99' },
      { from: 'you', to: 'bo', amount: '39.99' },
    ])
  })

  it('TC-20-03: nothing to transfer when everyone is settled', () => {
    expect(calcTransfers(nets({ you: '0.00', ana: '0.00' }))).toEqual([])
  })

  it('breaks ties by the given people order', () => {
    expect(calcTransfers(nets({ you: '-5.00', ana: '-5.00', bo: '5.00', cy: '5.00' }))).toEqual([
      { from: 'you', to: 'bo', amount: '5.00' },
      { from: 'ana', to: 'cy', amount: '5.00' },
    ])
  })
})
