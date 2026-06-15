import type { Interval } from '@/lib/recurrence'

type ValidationResult = { ok: true } | { ok: false; error: string }

const VALID_INTERVALS: Interval[] = ['monthly', '6mo', '12mo']

export function validateDayOfMonth(input: string): ValidationResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, error: 'Day of month is required' }

  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, error: 'Day of month must be a whole number' }
  }

  const n = parseInt(trimmed, 10)
  if (n < 1 || n > 31) {
    return { ok: false, error: 'Day of month must be between 1 and 31' }
  }

  return { ok: true }
}

export function validateInterval(input: string): ValidationResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, error: 'Interval is required' }

  if (!(VALID_INTERVALS as string[]).includes(trimmed)) {
    return { ok: false, error: `Interval must be one of: ${VALID_INTERVALS.join(', ')}` }
  }

  return { ok: true }
}

export function validateStartDate(input: string): ValidationResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, error: 'Start date is required' }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, error: 'Start date must be in YYYY-MM-DD format' }
  }

  return { ok: true }
}
