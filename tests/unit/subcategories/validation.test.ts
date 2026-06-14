import { describe, it, expect } from 'vitest'
import { validateSubcategoryName, validateParentGroupId } from '@/lib/validations/subcategories'

// TC-07-01: Create subcategory requires name + parent
// TC-07-02: Parent group is required
// TC-07-03: Rename validation
// TC-07-04: Case-insensitive unique within parent (DB-level; validation ensures non-empty name)
// TC-07-05: Same name allowed across different groups (structural — not a validation concern)

describe('validateSubcategoryName', () => {
  it('TC-07-01/03: accepts valid name', () => {
    expect(validateSubcategoryName('Rental')).toEqual({ ok: true })
  })

  it('TC-07-01/03: rejects empty string', () => {
    const result = validateSubcategoryName('')
    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toBeTruthy()
  })

  it('TC-07-01/03: rejects whitespace-only', () => {
    expect(validateSubcategoryName('   ').ok).toBe(false)
  })

  it('TC-07-04: trims before check — whitespace tabs rejected', () => {
    expect(validateSubcategoryName('\t').ok).toBe(false)
  })

  it('accepts name with spaces around real chars', () => {
    expect(validateSubcategoryName('  Fuel  ')).toEqual({ ok: true })
  })
})

describe('validateParentGroupId', () => {
  it('TC-07-02: accepts a valid UUID-like id', () => {
    expect(validateParentGroupId('abc-123')).toEqual({ ok: true })
  })

  it('TC-07-02: rejects empty string', () => {
    const result = validateParentGroupId('')
    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toBeTruthy()
  })

  it('TC-07-02: rejects null', () => {
    expect(validateParentGroupId(null as unknown as string).ok).toBe(false)
  })

  it('TC-07-02: rejects undefined', () => {
    expect(validateParentGroupId(undefined as unknown as string).ok).toBe(false)
  })
})
