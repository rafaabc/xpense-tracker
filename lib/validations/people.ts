export const PERSON_NAME_MAX = 50
export const FULL_SHARE_BPS = 10000

type ValueResult<T> = { ok: true; value: T } | { ok: false; error: string }
type ValidationResult = { ok: true } | { ok: false; error: string }

const PERCENT_ERROR = 'Percentage must be between 0 and 100 with up to 2 decimal places'
const TOTAL_ERROR = 'Percentages must add up to 100'

export function validatePersonName(name: string): ValueResult<string> {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Name is required' }
  if (trimmed.length > PERSON_NAME_MAX) {
    return { ok: false, error: `Name must be ${PERSON_NAME_MAX} characters or fewer` }
  }
  return { ok: true, value: trimmed }
}

/**
 * Parses a percentage ("33.33" or "33,33") into integer basis points (3333).
 * Works on the string digits so no floating-point arithmetic is involved.
 */
export function parsePercentToBps(input: string): ValueResult<number> {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(input.trim())
  if (!match) return { ok: false, error: PERCENT_ERROR }

  const bps = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  if (bps > FULL_SHARE_BPS) return { ok: false, error: PERCENT_ERROR }

  return { ok: true, value: bps }
}

export function validateSplitTotal(shares: number[]): ValidationResult {
  if (shares.some((s) => !Number.isInteger(s) || s < 0 || s > FULL_SHARE_BPS)) {
    return { ok: false, error: PERCENT_ERROR }
  }
  const total = shares.reduce((sum, s) => sum + s, 0)
  if (total !== FULL_SHARE_BPS) return { ok: false, error: TOTAL_ERROR }
  return { ok: true }
}

/** 3333 -> "33.33", 5000 -> "50" */
export function formatBps(bps: number): string {
  const whole = Math.floor(bps / 100)
  const fraction = String(bps % 100).padStart(2, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : String(whole)
}
