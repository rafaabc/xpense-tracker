import { describe, it, expect } from 'vitest'
import { validateGroupName } from '@/lib/validations/groups'

// TC-06-01: Create group name validation
// TC-06-02: Rename group validation
// TC-06-03: Case-insensitive uniqueness enforced at DB — validation ensures non-empty string
// TC-06-04: Same-name-different-case rejected (DB-level unique index; validation rejects empty/whitespace)

describe('validateGroupName', () => {
  it('TC-06-01/02: accepts a valid name', () => {
    expect(validateGroupName('Casa')).toEqual({ ok: true })
  })

  it('TC-06-01/02: accepts name with spaces', () => {
    expect(validateGroupName('Despesas Fixas')).toEqual({ ok: true })
  })

  it('TC-06-01/02: rejects empty string', () => {
    const result = validateGroupName('')
    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toBeTruthy()
  })

  it('TC-06-01/02: rejects whitespace-only string', () => {
    const result = validateGroupName('   ')
    expect(result.ok).toBe(false)
  })

  it('TC-06-03/04: trims before validation — pure whitespace rejected', () => {
    const result = validateGroupName('\t\n')
    expect(result.ok).toBe(false)
  })

  it('accepts name that is only spaces around real chars', () => {
    expect(validateGroupName('  Casa  ')).toEqual({ ok: true })
  })
})
