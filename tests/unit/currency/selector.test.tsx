import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CurrencySelector from '@/components/CurrencySelector'

// TC-05-01: DKK and BRL options are shown
// TC-05-02: Only DKK and BRL are offered
// TC-05-03: Default currency for new account is DKK (selector defaults to DKK)
// TC-05-04: Selecting currency updates UI (selector triggers action)

vi.mock('@/app/actions/currency', () => ({
  updateCurrency: vi.fn().mockResolvedValue(undefined),
}))

describe('CurrencySelector', () => {
  it('TC-05-01: renders DKK option', () => {
    render(<CurrencySelector current="DKK" />)
    expect(screen.getByRole('option', { name: /DKK/i })).toBeInTheDocument()
  })

  it('TC-05-01: renders BRL option', () => {
    render(<CurrencySelector current="DKK" />)
    expect(screen.getByRole('option', { name: /BRL/i })).toBeInTheDocument()
  })

  it('TC-05-02: exactly 2 currency options available', () => {
    render(<CurrencySelector current="DKK" />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
  })

  it('TC-05-03: defaults to DKK when current is DKK', () => {
    render(<CurrencySelector current="DKK" />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('DKK')
  })

  it('reflects BRL when current is BRL', () => {
    render(<CurrencySelector current="BRL" />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('BRL')
  })

  it('renders the display-only disclaimer text', () => {
    render(<CurrencySelector current="DKK" />)
    expect(screen.getByText(/stored values are never converted/i)).toBeInTheDocument()
  })
})
