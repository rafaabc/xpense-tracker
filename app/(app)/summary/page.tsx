import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getMonthlyRows,
  getAnnualRows,
  getAvailableYears,
  getUserCurrency,
} from '@/app/actions/summaries'
import {
  calcMonthlyBreakdown,
  buildMatrix,
  calcMonthTotals,
  calcGroupAverages,
} from '@/lib/summaries'
import SummaryTabs from './SummaryTabs'
import MonthlySummary from './MonthlySummary'
import AnnualSummary from './AnnualSummary'

function currentYearMonth(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

interface SearchParams {
  tab?: string
  month?: string
  year?: string
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const params = await searchParams
  const tab = params.tab === 'annual' ? 'annual' : 'monthly'
  const month = params.month ?? currentYearMonth()
  const yearStr = params.year
  const yearNum = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear()

  const [currency, availableYears] = await Promise.all([
    getUserCurrency(),
    getAvailableYears(),
  ])

  const currentYear = new Date().getFullYear()
  const selectedYear = availableYears.includes(yearNum) ? yearNum : (availableYears[0] ?? currentYear)

  let monthlyBreakdown = null
  let annualData = null

  if (tab === 'monthly') {
    const rows = await getMonthlyRows(month)
    monthlyBreakdown = calcMonthlyBreakdown(rows)
  } else {
    const rows = await getAnnualRows(selectedYear)
    const matrix = buildMatrix(rows, selectedYear)
    const monthTotals = calcMonthTotals(matrix)
    const annualTotal = Object.values(monthTotals).reduce((s, v) => s + v, 0)

    const groupTotals: Record<string, number> = {}
    const groupNames: Record<string, string> = {}
    for (const row of rows) {
      groupTotals[row.groupId] = (groupTotals[row.groupId] ?? 0) + parseFloat(row.amount)
      groupNames[row.groupId] = row.groupName
    }
    const groupAverages = calcGroupAverages(groupTotals, selectedYear)

    annualData = { matrix, monthTotals, annualTotal, groupTotals, groupAverages, groupNames }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 900 }}>
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 'var(--text-2xl)',
            color: 'var(--ink-900)',
            margin: '0 0 6px',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          Summary
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-md)',
            color: 'var(--ink-500)',
            margin: 0,
          }}
        >
          Spending breakdown by month and year.
        </p>
      </div>

      <SummaryTabs activeTab={tab} currentMonth={month} currentYear={selectedYear} />

      {tab === 'monthly' && (
        <MonthlySummary
          breakdown={monthlyBreakdown!}
          month={month}
          currency={currency}
        />
      )}

      {tab === 'annual' && annualData && (
        <AnnualSummary
          matrix={annualData.matrix}
          monthTotals={annualData.monthTotals}
          annualTotal={annualData.annualTotal}
          groupAverages={annualData.groupAverages}
          groupNames={annualData.groupNames}
          year={selectedYear}
          availableYears={availableYears}
          currency={currency}
        />
      )}
    </div>
  )
}
