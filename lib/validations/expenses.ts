type ValidationResult = { ok: true } | { ok: false; error: string }

export function validateAmount(input: string): ValidationResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, error: 'Amount is required' }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { ok: false, error: 'Amount must be a positive number with up to 2 decimal places' }
  }

  if (parseFloat(trimmed) <= 0) {
    return { ok: false, error: 'Amount must be greater than 0.00' }
  }

  return { ok: true }
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
