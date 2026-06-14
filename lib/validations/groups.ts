type ValidationResult = { ok: true } | { ok: false; error: string }

export function validateGroupName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { ok: false, error: 'Group name is required' }
  }
  return { ok: true }
}
