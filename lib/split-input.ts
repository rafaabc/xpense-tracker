// Payer and split validation shared by expenses and recurring templates.
// Not a server action on purpose: callers pass the userId of their own session.
import { db } from '@/lib/db'
import { people } from '@/lib/schema'
import { eq, asc } from 'drizzle-orm'
import { parsePercentToBps, validateSplitTotal } from '@/lib/validations/people'
import { SPLIT_MODES, type ShareBps, type SplitMode } from '@/lib/split'
import { ActionError } from '@/lib/action-result'

export interface SplitPayload {
  payerPersonId: string
  splitMode: SplitMode
  /** Percentages, only read when splitMode is "split" */
  shares?: { personId: string; percent: string }[]
}

/** Validates everything that needs no database access. */
export function parseSplit({ splitMode, shares }: SplitPayload): ShareBps[] {
  if (!SPLIT_MODES.includes(splitMode)) throw new ActionError('Invalid split mode')
  if (splitMode !== 'split') return []

  const parsed = (shares ?? []).map(({ personId, percent }) => {
    const result = parsePercentToBps(percent)
    if (!result.ok) throw new ActionError(result.error)
    return { personId, bps: result.value }
  })
  const total = validateSplitTotal(parsed.map((s) => s.bps))
  if (!total.ok) throw new ActionError(total.error)
  return parsed
}

/**
 * Checks the payer and share people belong to the user, then returns the shares
 * to store (0% shares dropped, oldest person first for rounding ties).
 */
export async function resolveShares(
  payerPersonId: string,
  shares: ShareBps[],
  userId: string,
): Promise<ShareBps[]> {
  const owned = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.userId, userId))
    .orderBy(asc(people.createdAt))

  const order = owned.map((p) => p.id)
  const ids = shares.map((s) => s.personId)
  const allOwned = [payerPersonId, ...ids].every((id) => order.includes(id))
  if (!allOwned || new Set(ids).size !== ids.length) throw new ActionError('Person not found')

  return shares
    .filter((s) => s.bps > 0)
    .sort((a, b) => order.indexOf(a.personId) - order.indexOf(b.personId))
}
