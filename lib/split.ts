import { FULL_SHARE_BPS } from '@/lib/validations/people'

export const SPLIT_MODES = ['personal', 'split'] as const
export type SplitMode = (typeof SPLIT_MODES)[number]

export interface ShareBps {
  personId: string
  bps: number
}

export interface AllocatedShare extends ShareBps {
  amount: string
}

/** "361.6" -> 36160n. Expects an already validated, dot-separated amount. */
export function toCents(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.')
  return BigInt(whole + fraction.padEnd(2, '0'))
}

/** 36160n -> "361.60". Non-negative values only. */
export function fromCents(cents: bigint): string {
  const digits = cents.toString().padStart(3, '0')
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`
}

/**
 * Splits an amount by basis points using the largest remainder method, so the
 * shares always add up to the amount. Leftover cents go to the highest
 * remainders; ties go to the payer, then follow the order of `shares`
 * (pass people oldest first).
 */
export function allocateShares(amount: string, shares: ShareBps[], payerId: string): AllocatedShare[] {
  const full = BigInt(FULL_SHARE_BPS)
  const cents = toCents(amount)

  const parts = shares.map((share) => {
    const raw = cents * BigInt(share.bps)
    return { ...share, cents: raw / full, remainder: raw % full }
  })

  let leftover = cents - parts.reduce((sum, p) => sum + p.cents, BigInt(0))

  const byPriority = [...parts].sort((a, b) => {
    if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1
    return Number(b.personId === payerId) - Number(a.personId === payerId)
  })

  for (const part of byPriority) {
    if (leftover <= BigInt(0)) break
    part.cents += BigInt(1)
    leftover -= BigInt(1)
  }

  return parts.map((p) => ({ personId: p.personId, bps: p.bps, amount: fromCents(p.cents) }))
}
