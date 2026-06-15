import type { Currency } from '@/lib/validations/currency'

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  DKK: 'kr',
  BRL: 'R$',
}

export function formatAmount(amount: string | number, currency: Currency): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
  return `${CURRENCY_SYMBOLS[currency]} ${formatted}`
}
