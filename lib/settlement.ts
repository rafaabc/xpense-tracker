import { toCents, fromCents } from '@/lib/split'
import type { SplitMode } from '@/lib/split'

export interface BalancePerson {
  id: string
  isSelf: boolean
}

export interface BalanceExpense {
  amount: string
  /** null means the user paid */
  payerPersonId: string | null
  splitMode: SplitMode
  shares: { personId: string; amount: string }[]
}

export interface PersonBalance {
  personId: string
  paid: string
  share: string
  /** paid minus share; negative means the person owes money */
  net: string
}

export interface Transfer {
  from: string
  to: string
  amount: string
}

const ZERO = BigInt(0)

function signedFromCents(cents: bigint): string {
  return cents < ZERO ? `-${fromCents(-cents)}` : fromCents(cents)
}

function signedToCents(value: string): bigint {
  return value.startsWith('-') ? -toCents(value.slice(1)) : toCents(value)
}

/** One balance per person, in the order of `people`. */
export function calcBalances(people: BalancePerson[], expenses: BalanceExpense[]): PersonBalance[] {
  const selfId = people.find((p) => p.isSelf)?.id
  const totals = new Map(people.map((p) => [p.id, { paid: ZERO, share: ZERO }]))
  const add = (personId: string | undefined, key: 'paid' | 'share', amount: string) => {
    const total = personId ? totals.get(personId) : undefined
    if (total) total[key] += toCents(amount)
  }

  for (const expense of expenses) {
    const payerId = expense.payerPersonId ?? selfId
    add(payerId, 'paid', expense.amount)
    if (expense.splitMode === 'split') {
      for (const share of expense.shares) add(share.personId, 'share', share.amount)
    } else {
      // A personal expense is entirely the payer's own cost
      add(payerId, 'share', expense.amount)
    }
  }

  return people.map(({ id }) => {
    const { paid, share } = totals.get(id)!
    return { personId: id, paid: fromCents(paid), share: fromCents(share), net: signedFromCents(paid - share) }
  })
}

/**
 * Greedy settlement: the largest debtor pays the largest creditor until every
 * net is zero (at most n - 1 transfers). Ties follow the order of `balances`.
 */
export function calcTransfers(balances: PersonBalance[]): Transfer[] {
  const open = balances.map((b) => ({ personId: b.personId, cents: signedToCents(b.net) }))
  const transfers: Transfer[] = []

  for (;;) {
    let debtor = open[0]
    let creditor = open[0]
    for (const entry of open) {
      if (entry.cents < debtor.cents) debtor = entry
      if (entry.cents > creditor.cents) creditor = entry
    }
    if (!debtor || debtor.cents >= ZERO || creditor.cents <= ZERO) return transfers

    const amount = -debtor.cents < creditor.cents ? -debtor.cents : creditor.cents
    debtor.cents += amount
    creditor.cents -= amount
    transfers.push({ from: debtor.personId, to: creditor.personId, amount: fromCents(amount) })
  }
}
