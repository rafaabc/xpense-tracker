import type { Interval } from '@/lib/recurrence'

export const EXPENSES_PAGE_SIZE = 25

export interface ExpenseRow {
  id: string
  amount: string
  date: string
  subcategoryId: string
  subcategoryName: string
  groupId: string
  groupName: string
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
}
