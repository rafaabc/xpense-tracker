import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-08-03/04/10/11: recurrence generation with mocked DB
// TC-09-11: Pending renewal (lastRenewedAt null) does NOT block expense generation
// TC-09-12: Unacted renewal — template keeps generating at original amount
// Pyramid mocked-integration #27

// ─── Mock setup ─────────────────────────────────────────────────────────────
// Mirror the pattern used in tests/mocked-integration/summaries/actions.test.ts

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSelect = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/schema', () => ({
  recurringTemplates: {
    userId: 'user_id',
    active: 'active',
    id: 'id',
    lastGeneratedDate: 'last_generated_date',
  },
  expenses: {
    userId: 'user_id',
    subcategoryId: 'subcategory_id',
    amount: 'amount',
    date: 'date',
  },
}))

// Helper: build a chainable query mock that resolves to `value`.
// Returns an explicitly-typed object so .mock.calls is accessible without casting.
function chainable(value: unknown) {
  const where = vi.fn().mockResolvedValue(value)
  const returning = vi.fn().mockResolvedValue(value)
  const values = vi.fn()
  const set = vi.fn()
  const from = vi.fn()
  const obj = { from, where, values, returning, set }
  from.mockReturnValue(obj)
  values.mockReturnValue(obj)
  set.mockReturnValue(obj)
  return obj
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── runCatchUp ──────────────────────────────────────────────────────────────

describe('runCatchUp', () => {
  it('inserts one expense per due occurrence and advances lastGeneratedDate (TC-08-03)', async () => {
    // Template with two due occurrences
    const templates = [
      {
        id: 'tmpl-1',
        userId: 'user-1',
        subcategoryId: 'sub-1',
        amount: '500.00',
        startDate: '2024-01-15',
        interval: 'monthly' as const,
        dayOfMonth: 15,
        active: true,
        lastRenewedAt: null,
        lastGeneratedDate: null,
      },
    ]

    const selectChain = chainable(templates)
    mockSelect.mockReturnValue(selectChain)

    // insert chain
    const insertChain = chainable([])
    mockInsert.mockReturnValue(insertChain)

    // update chain
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    mockUpdate.mockReturnValue(updateChain)

    const { runCatchUp } = await import('@/lib/recurrence-engine')
    await runCatchUp('user-1', '2024-03-15')

    // Should have called insert once with multiple values (bulk insert)
    expect(mockInsert).toHaveBeenCalledOnce()
    const insertValues = insertChain.values.mock.calls[0][0] as Array<{ date: string }>
    expect(insertValues.map((v) => v.date)).toEqual(['2024-01-15', '2024-02-15', '2024-03-15'])

    // Should advance lastGeneratedDate to the last occurrence
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ lastGeneratedDate: '2024-03-15' })
    )
  })

  it('skips insert when no occurrences are due', async () => {
    const templates = [
      {
        id: 'tmpl-1',
        userId: 'user-1',
        subcategoryId: 'sub-1',
        amount: '500.00',
        startDate: '2024-01-15',
        interval: 'monthly' as const,
        dayOfMonth: 15,
        active: true,
        lastRenewedAt: null,
        lastGeneratedDate: '2024-03-15', // already fully generated
      },
    ]

    const selectChain = chainable(templates)
    mockSelect.mockReturnValue(selectChain)

    const { runCatchUp } = await import('@/lib/recurrence-engine')
    await runCatchUp('user-1', '2024-03-15')

    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('clamps day-of-month overflow for short months (TC-08-04)', async () => {
    const templates = [
      {
        id: 'tmpl-1',
        userId: 'user-1',
        subcategoryId: 'sub-1',
        amount: '200.00',
        startDate: '2025-01-31',
        interval: 'monthly' as const,
        dayOfMonth: 31,
        active: true,
        lastRenewedAt: null,
        lastGeneratedDate: '2025-01-31', // Jan already generated
      },
    ]

    const selectChain = chainable(templates)
    mockSelect.mockReturnValue(selectChain)
    const insertChain = chainable([])
    mockInsert.mockReturnValue(insertChain)
    const updateChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) }
    mockUpdate.mockReturnValue(updateChain)

    const { runCatchUp } = await import('@/lib/recurrence-engine')
    await runCatchUp('user-1', '2025-02-28')

    const insertValues = insertChain.values.mock.calls[0][0] as Array<{ date: string }>
    expect(insertValues.map((v) => v.date)).toContain('2025-02-28') // clamped
  })

  it('does not insert expenses before startDate (future-only edit semantics, TC-08-10/11)', async () => {
    // Template startDate is March — Jan and Feb should never appear even if day matches
    const templates = [
      {
        id: 'tmpl-1',
        userId: 'user-1',
        subcategoryId: 'sub-1',
        amount: '300.00',
        startDate: '2024-03-15',
        interval: 'monthly' as const,
        dayOfMonth: 15,
        active: true,
        lastRenewedAt: null,
        lastGeneratedDate: null,
      },
    ]

    const selectChain = chainable(templates)
    mockSelect.mockReturnValue(selectChain)
    const insertChain = chainable([])
    mockInsert.mockReturnValue(insertChain)
    const updateChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) }
    mockUpdate.mockReturnValue(updateChain)

    const { runCatchUp } = await import('@/lib/recurrence-engine')
    await runCatchUp('user-1', '2024-05-15')

    const insertValues = insertChain.values.mock.calls[0][0] as Array<{ date: string }>
    const dates = insertValues.map((v) => v.date)
    expect(dates).not.toContain('2024-01-15')
    expect(dates).not.toContain('2024-02-15')
    expect(dates).toContain('2024-03-15')
  })

  it('TC-09-11: pending renewal (lastRenewedAt null) does NOT block generation', async () => {
    // Template has unconfirmed renewal — lastRenewedAt is null — but generation still runs
    const templates = [
      {
        id: 'tmpl-renewal',
        userId: 'user-1',
        subcategoryId: 'sub-1',
        amount: '500.00',
        startDate: '2024-01-15',
        interval: 'monthly' as const,
        dayOfMonth: 15,
        active: true,
        lastRenewedAt: null, // renewal pending, user has not confirmed yet
        lastGeneratedDate: '2024-01-15', // one month already generated
      },
    ]

    const selectChain = chainable(templates)
    mockSelect.mockReturnValue(selectChain)
    const insertChain = chainable([])
    mockInsert.mockReturnValue(insertChain)
    const updateChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) }
    mockUpdate.mockReturnValue(updateChain)

    const { runCatchUp } = await import('@/lib/recurrence-engine')
    await runCatchUp('user-1', '2024-02-15')

    // Generation proceeds — insert was called for the due occurrence
    expect(mockInsert).toHaveBeenCalledOnce()
  })

  it('TC-09-12: unacted renewal template keeps generating at original amount', async () => {
    // User has not confirmed/updated the renewal — amount stays at original
    const templates = [
      {
        id: 'tmpl-renewal',
        userId: 'user-1',
        subcategoryId: 'sub-1',
        amount: '800.00', // original price
        startDate: '2024-01-15',
        interval: 'monthly' as const,
        dayOfMonth: 15,
        active: true,
        lastRenewedAt: null,
        lastGeneratedDate: '2024-01-15',
      },
    ]

    const selectChain = chainable(templates)
    mockSelect.mockReturnValue(selectChain)
    const insertChain = chainable([])
    mockInsert.mockReturnValue(insertChain)
    const updateChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) }
    mockUpdate.mockReturnValue(updateChain)

    const { runCatchUp } = await import('@/lib/recurrence-engine')
    await runCatchUp('user-1', '2024-02-15')

    // Generated expense preserves original amount
    const insertValues = insertChain.values.mock.calls[0][0] as Array<{ amount: string }>
    expect(insertValues[0].amount).toBe('800.00')
  })
})
