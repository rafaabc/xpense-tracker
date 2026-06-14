type ValidationResult = { ok: true } | { ok: false; error: string }

export function validateSubcategoryName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { ok: false, error: 'Subcategory name is required' }
  }
  return { ok: true }
}

export function validateParentGroupId(groupId: string): ValidationResult {
  if (!groupId || groupId.trim().length === 0) {
    return { ok: false, error: 'Parent group is required' }
  }
  return { ok: true }
}
