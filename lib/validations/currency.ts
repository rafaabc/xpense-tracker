export const CURRENCIES = ['DKK', 'BRL'] as const
export type Currency = (typeof CURRENCIES)[number]

export const DEFAULT_CURRENCY: Currency = 'DKK'

export function validateCurrency(value: string): value is Currency {
  return CURRENCIES.includes(value as Currency)
}
