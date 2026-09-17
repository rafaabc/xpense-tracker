type ValidationResult = { ok: true } | { ok: false; error: string }
type AmountResult = { ok: true; value: string } | { ok: false; error: string }

const AMOUNT_ERROR = 'Amount must be a positive number with up to 2 decimal places (e.g. 361.61 or 361,61)'

/**
 * Accepts either `.` or `,` as the decimal separator (DKK/BRL keyboards emit
 * a comma for `inputMode="decimal"`) and normalizes to a dot. Returns null
 * when the input is ambiguous or malformed so the caller can reject it.
 */
function normalizeAmount(input: string): string | null {
  const stripped = input.replace(/[\s ]/g, '')
  if (!stripped) return null

  const hasDot = stripped.includes('.')
  const hasComma = stripped.includes(',')

  if (hasDot && hasComma) {
    const lastDot = stripped.lastIndexOf('.')
    const lastComma = stripped.lastIndexOf(',')
    const decimalSep = lastDot > lastComma ? '.' : ','
    const groupSep = decimalSep === '.' ? ',' : '.'

    const parts = stripped.split(decimalSep)
    if (parts.length !== 2) return null
    const [wholePart, decimalPart] = parts

    const groupRe = new RegExp(`^\\d{1,3}(\\${groupSep}\\d{3})*$`)
    if (!groupRe.test(wholePart)) return null

    return `${wholePart.split(groupSep).join('')}.${decimalPart}`
  }

  if (hasComma) {
    const parts = stripped.split(',')
    if (parts.length === 2 && /^\d{1,2}$/.test(parts[1])) {
      return `${parts[0]}.${parts[1]}`
    }
    return null
  }

  return stripped
}

export function validateAmount(input: string): AmountResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, error: 'Amount is required' }

  const normalized = normalizeAmount(trimmed)
  if (normalized === null || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { ok: false, error: AMOUNT_ERROR }
  }

  if (parseFloat(normalized) <= 0) {
    return { ok: false, error: 'Amount must be greater than 0.00' }
  }

  return { ok: true, value: normalized }
}

export function validateExpenseDate(date: string, today?: string): ValidationResult {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: 'Date is required' }
  }

  const effectiveToday = today ?? new Date().toISOString().slice(0, 10)

  if (date > effectiveToday) {
    return { ok: false, error: 'Date cannot be in the future' }
  }

  return { ok: true }
}
