import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BalanceView from '@/components/balance/BalanceView'
import { formatAmount } from '@/lib/format'

const push = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const person = (personId: string, name: string, net: string, isSelf = false) => ({
  personId, name, isSelf, paid: '100.00', share: '40.00', net,
})
const balances = [person('you', 'Rafa', '-60.00', true), person('ana', 'Ana', '60.00'), person('bo', 'Bo', '0.00')]

beforeEach(() => {
  cleanup()
  push.mockReset()
})

const money = (value: string, currency: 'DKK' | 'BRL' = 'DKK') => formatAmount(value, currency)
const text = (element: HTMLElement) => element.textContent?.replace(/\s+/g, ' ') ?? ''
const normalized = (value: string) => value.replace(/\s+/g, ' ')

function renderView(props: Partial<React.ComponentProps<typeof BalanceView>> = {}) {
  render(<BalanceView month="2026-05" currency="DKK" balances={balances} transfers={[]} {...props} />)
}

describe('BalanceView', () => {
  it.each(['DKK', 'BRL'] as const)('TC-20-07: words the transfers in %s without converting', (currency) => {
    renderView({
      currency,
      transfers: [
        { from: 'you', to: 'ana', amount: '60.00' },
        { from: 'bo', to: 'you', amount: '5.00' },
        { from: 'bo', to: 'ana', amount: '1.00' },
      ],
    })
    const items = within(screen.getByRole('list', { name: 'Transfers' })).getAllByRole('listitem').map(text)
    expect(items).toEqual([
      normalized(`You pay Ana ${money('60.00', currency)}`),
      normalized(`Bo pays you ${money('5.00', currency)}`),
      normalized(`Bo pays Ana ${money('1.00', currency)}`),
    ])
  })

  it('TC-20-08: says all settled when there are no transfers', () => {
    renderView()
    expect(screen.getByText('All settled for this month')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Transfers' })).not.toBeInTheDocument()
  })

  it('shows paid, share and standing per person', () => {
    renderView()
    const rows = within(screen.getByRole('list', { name: 'People' })).getAllByRole('listitem').map(text)
    expect(rows[0]).toContain('Rafa')
    expect(rows[0]).toContain(normalized(`Owes ${money('60.00')}`))
    expect(rows[0]).toContain(normalized(`Paid ${money('100.00')}`))
    expect(rows[0]).toContain(normalized(`Share ${money('40.00')}`))
    expect(rows[1]).toContain(normalized(`Gets back ${money('60.00')}`))
    expect(rows[2]).toContain('Settled')
  })

  it('points to Settings while only self exists', () => {
    renderView({ balances: [person('you', 'Rafa', '0.00', true)] })
    expect(screen.getByRole('link', { name: 'Add people in Settings' })).toHaveAttribute('href', '/settings')
  })

  it('changes month', async () => {
    const user = userEvent.setup()
    renderView()
    await user.selectOptions(screen.getByLabelText('Month'), screen.getAllByRole('option')[1])
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/balance\?month=\d{4}-\d{2}$/))
  })
})
