// Pure date/interval logic for recurring expense templates.
// No DB, no session — fully unit-testable.

export type Interval = 'monthly' | '6mo' | '12mo'

export const INTERVALS: Record<Interval, { label: string; monthCount: number }> = {
  monthly: { label: 'Monthly', monthCount: 1 },
  '6mo':   { label: 'Every 6 months', monthCount: 6 },
  '12mo':  { label: 'Every 12 months', monthCount: 12 },
}

export interface RecurringTemplate {
  id: string
  userId: string
  subcategoryId: string
  amount: string
  startDate: string           // YYYY-MM-DD
  interval: Interval
  dayOfMonth: number
  active: boolean
  lastRenewedAt: string | null  // YYYY-MM-DD
  lastGeneratedDate: string | null // YYYY-MM-DD
}

export interface SuccessorValues {
  userId: string
  subcategoryId: string
  amount: string
  startDate: string
  interval: Interval
  dayOfMonth: number
  lastGeneratedDate: string | null
}

/** Returns the lesser of dayOfMonth and the last day of the given month (TC-08-04). */
export function clampDayOfMonth(year: number, month: number, dayOfMonth: number): number {
  const lastDay = new Date(year, month, 0).getDate() // day 0 of next month = last day of this month
  return Math.min(dayOfMonth, lastDay)
}

/** Advances {year, month} by one interval step. */
export function addInterval(
  ym: { year: number; month: number },
  interval: Interval
): { year: number; month: number } {
  const { monthCount } = INTERVALS[interval]
  const totalMonths = (ym.year * 12 + ym.month - 1) + monthCount
  return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1 }
}

/** Formats {year, month, day} as YYYY-MM-DD. */
function fmt(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Returns all occurrence dates for a template that:
 *   - are >= startDate
 *   - are > lastGeneratedDate (if set)
 *   - are <= today
 *
 * Anchored to the start month so edits never retroactively produce occurrences
 * before startDate (satisfies TC-08-10/11 future-only edit semantics).
 */
export function occurrencesDue(template: RecurringTemplate, today: string): string[] {
  const { startDate, interval, dayOfMonth, lastGeneratedDate } = template

  // Walk from the start month forward until past today
  let cur = {
    year: parseInt(startDate.slice(0, 4), 10),
    month: parseInt(startDate.slice(5, 7), 10),
  }

  const results: string[] = []

  // Safety cap: no template should need more than ~500 cycles
  for (let i = 0; i < 600; i++) {
    const day = clampDayOfMonth(cur.year, cur.month, dayOfMonth)
    const date = fmt(cur.year, cur.month, day)

    if (date > today) break

    if (date >= startDate && (lastGeneratedDate === null || date > lastGeneratedDate)) {
      results.push(date)
    }

    cur = addInterval(cur, interval)
  }

  return results
}

/**
 * Returns the next occurrence date after max(today, lastGeneratedDate).
 * Used to display "next execution date" in the template list (TC-08-06).
 */
export function nextExecutionDate(template: RecurringTemplate, today: string): string {
  const { startDate, interval, dayOfMonth, lastGeneratedDate } = template
  const anchor = lastGeneratedDate && lastGeneratedDate > today ? lastGeneratedDate : today

  let cur = {
    year: parseInt(startDate.slice(0, 4), 10),
    month: parseInt(startDate.slice(5, 7), 10),
  }

  for (let i = 0; i < 600; i++) {
    const day = clampDayOfMonth(cur.year, cur.month, dayOfMonth)
    const date = fmt(cur.year, cur.month, day)

    if (date >= startDate && date > anchor) {
      return date
    }

    cur = addInterval(cur, interval)
  }

  // Fallback: should never happen with valid templates
  return fmt(cur.year, cur.month, clampDayOfMonth(cur.year, cur.month, dayOfMonth))
}

/** Returns the date 12 months after the anchor (lastRenewedAt ?? startDate). */
export function renewalDueDate(template: Pick<RecurringTemplate, 'startDate' | 'lastRenewedAt'>): string {
  const anchor = template.lastRenewedAt ?? template.startDate
  const year = parseInt(anchor.slice(0, 4), 10)
  const month = parseInt(anchor.slice(5, 7), 10)
  const day = parseInt(anchor.slice(8, 10), 10)
  const next = addInterval({ year, month }, '12mo')
  return fmt(next.year, next.month, clampDayOfMonth(next.year, next.month, day))
}

/** True when today is on or past the annual renewal date (TC-09-01/02). */
export function isRenewalDue(template: Pick<RecurringTemplate, 'startDate' | 'lastRenewedAt'>, today: string): boolean {
  return today >= renewalDueDate(template)
}

/**
 * Builds the successor template values when a user updates their recurring amount.
 * Preserves interval/dayOfMonth, uses the renewal due date as the new startDate,
 * carries over lastGeneratedDate for seamless generation (TC-09-07/08).
 */
export function buildSuccessor(template: RecurringTemplate, newAmount: string): SuccessorValues {
  return {
    userId: template.userId,
    subcategoryId: template.subcategoryId,
    amount: newAmount,
    startDate: renewalDueDate(template),
    interval: template.interval,
    dayOfMonth: template.dayOfMonth,
    lastGeneratedDate: template.lastGeneratedDate,
  }
}
