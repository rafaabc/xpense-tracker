import Link from 'next/link'

interface Props {
  activeTab: 'monthly' | 'annual'
  currentMonth: string
  currentYear: number
}

export default function SummaryTabs({ activeTab, currentMonth, currentYear }: Props) {
  const tabs = [
    { id: 'monthly', label: 'Monthly', href: `/summary?tab=monthly&month=${currentMonth}` },
    { id: 'annual', label: 'Annual', href: `/summary?tab=annual&year=${currentYear}` },
  ] as const

  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--paper-dim)',
        borderRadius: 'var(--radius-lg)',
        padding: 4,
        gap: 2,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab
        return (
          <Link
            key={tab.id}
            href={tab.href}
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              padding: '6px 18px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              background: active ? 'var(--surface-card)' : 'transparent',
              color: active ? 'var(--ink-900)' : 'var(--ink-500)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--dur-fast)',
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
