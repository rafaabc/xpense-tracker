export interface MonthlyRow {
  groupId: string
  groupName: string
  amount: string
}

export interface GroupBreakdown {
  groupId: string
  name: string
  subtotal: number
  pct: number
}

export interface AnnualRow {
  groupId: string
  groupName: string
  month: number
  amount: string
}

export type Matrix = Record<string, Record<number, number>>

export function calcMonthlyBreakdown(rows: MonthlyRow[]): GroupBreakdown[] {
  const totals = new Map<string, { name: string; subtotal: number }>()
  for (const row of rows) {
    const prev = totals.get(row.groupId)
    totals.set(row.groupId, {
      name: row.groupName,
      subtotal: (prev?.subtotal ?? 0) + parseFloat(row.amount),
    })
  }

  const grandTotal = Array.from(totals.values()).reduce((s, g) => s + g.subtotal, 0)
  if (grandTotal === 0) return []

  const breakdown: GroupBreakdown[] = Array.from(totals.entries()).map(([groupId, g]) => ({
    groupId,
    name: g.name,
    subtotal: g.subtotal,
    pct: Math.round((g.subtotal / grandTotal) * 1000) / 10,
  }))

  // Clamp last group so all pcts sum to exactly 100
  const sumExceptLast = breakdown.slice(0, -1).reduce((s, g) => s + g.pct, 0)
  if (breakdown.length > 0) {
    breakdown[breakdown.length - 1].pct = Math.round((100 - sumExceptLast) * 10) / 10
  }

  return breakdown
}

export function elapsedMonths(year: number): number {
  const now = new Date()
  const currentYear = now.getFullYear()
  if (year < currentYear) return 12
  // current year: months 1..currentMonth
  return Math.max(1, now.getMonth() + 1)
}

export function calcGroupAverages(
  groupTotals: Record<string, number>,
  year: number
): Record<string, number> {
  const divisor = elapsedMonths(year)
  const result: Record<string, number> = {}
  for (const [groupId, total] of Object.entries(groupTotals)) {
    result[groupId] = total / divisor
  }
  return result
}

export function buildMatrix(rows: AnnualRow[], year: number): Matrix {
  // Collect all group ids
  const groupIds = new Set(rows.map((r) => r.groupId))
  const matrix: Matrix = {}
  for (const gid of groupIds) {
    matrix[gid] = {}
    for (let m = 1; m <= 12; m++) matrix[gid][m] = 0
  }
  for (const row of rows) {
    matrix[row.groupId][row.month] = (matrix[row.groupId][row.month] ?? 0) + parseFloat(row.amount)
  }
  // year param kept for API consistency
  void year
  return matrix
}

export function calcMonthTotals(matrix: Matrix): Record<number, number> {
  const totals: Record<number, number> = {}
  for (let m = 1; m <= 12; m++) totals[m] = 0
  for (const monthMap of Object.values(matrix)) {
    for (let m = 1; m <= 12; m++) {
      totals[m] += monthMap[m] ?? 0
    }
  }
  return totals
}
