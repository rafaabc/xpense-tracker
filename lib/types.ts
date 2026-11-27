import type { Interval } from '@/lib/recurrence'
import type { SplitMode } from '@/lib/split'

export const EXPENSES_PAGE_SIZE = 25

export interface ExpenseRow {
  id: string
  amount: string
  date: string
  subcategoryId: string
  subcategoryName: string
  groupId: string
  groupName: string
  /** null on legacy rows: the user paid */
  payerPersonId: string | null
  splitMode: SplitMode
  shares: { personId: string; shareBps: number }[]
}

export interface PersonRow {
  id: string
  name: string
  isSelf: boolean
  defaultShareBps: number
}

export interface RecurringTemplateRow {
  id: string
  amount: string
  subcategoryId: string
  subcategoryName: string
  groupId: string
  groupName: string
  startDate: string
  interval: Interval
  dayOfMonth: number
  active: boolean
  lastRenewedAt: string | null
  lastGeneratedDate: string | null
  nextExecutionDate: string
  /** null on legacy templates: the user pays */
  payerPersonId: string | null
  splitMode: SplitMode
  shares: { personId: string; shareBps: number }[]
}
