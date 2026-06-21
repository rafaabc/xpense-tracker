'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  Tags,
  Repeat,
  BarChart3,
  Settings,
} from 'lucide-react'
import type { ComponentType } from 'react'

interface NavItem {
  href: string
  label: string
  icon: ComponentType<{ size?: number }>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/categories', label: 'Categories', icon: Tags },
  { href: '/recurring', label: 'Recurring', icon: Repeat },
  { href: '/summary', label: 'Summary', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const topLinkBase = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  textDecoration: 'none',
  padding: '4px 10px',
  borderRadius: 'var(--radius-sm)',
} as const

export default function AppNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Desktop: top nav row */}
      <nav className="app-nav-top">
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              ...topLinkBase,
              color: isActive(href) ? 'var(--brand)' : 'var(--ink-700)',
              background: isActive(href) ? 'var(--emerald-50)' : 'transparent',
            }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile: fixed bottom tab bar */}
      <nav
        className="app-nav-bottom"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          background: 'var(--white)',
          borderTop: '1px solid var(--line)',
          boxShadow: '0 -2px 8px rgba(20, 50, 38, 0.06)',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '6px 0 env(safe-area-inset-bottom, 8px)',
          height: 72,
        }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                minWidth: 48,
                minHeight: 44,
                textDecoration: 'none',
                color: active ? 'var(--brand)' : 'var(--ink-500)',
              }}
            >
              <Icon size={20} />
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
