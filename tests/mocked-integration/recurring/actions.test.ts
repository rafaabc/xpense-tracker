import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-08-07/08/09: delete stops future generation, past entries untouched
// TC-08-10/11: updates are future-only
// TC-09-05/06/07/08: renewal — confirm extends, update value deprecates + creates successor
// Pyramid mocked-integration #28

// ─── Mock setup ─────────────────────────────────────────────────────────────

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockSelect = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/schema', () => ({
  recurringTemplates: {
    id: 'id',
    userId: 'user_id',
    subcategoryId: 'subcategory_id',
    amount: 'amount',
    startDate: 'start_date',
    interval: 'interval',
    dayOfMonth: 'day_of_month',
    active: 'active',
    lastRenewedAt: 'last_renewed_at',
    lastGeneratedDate: 'last_generated_date',
  },
  subcategories: { id: 'id', groupId: 'group_id' },
  groups: { id: 'id', userId: 'user_id' },
  expenses: {},
}))

function makeChain(resolved: unknown) {
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(resolved),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(resolved),
    set: vi.fn().mockReturnThis(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── deleteRecurringTemplate ─────────────────────────────────────────────────

describe('deleteRecurringTemplate', () => {
  it('calls db.delete on the template (TC-08-07)', async () => {
    // Ownership check: select returns a matching row
    const ownershipChain = makeChain([{ id: 'tmpl-1' }])
    mockSelect.mockReturnValue(ownershipChain)

    const deleteChain = { where: vi.fn().mockResolvedValue([]) }
    mockDelete.mockReturnValue(deleteChain)

    const { deleteRecurringTemplate } = await import('@/app/actions/recurring')
    await deleteRecurringTemplate('tmpl-1')

    expect(mockDelete).toHaveBeenCalledOnce()
    // Does NOT touch expenses — past entries stay (TC-08-09)
    expect(mockDelete).toHaveBeenCalledTimes(1)
  })

  it('throws when template belongs to another user (cross-tenant protection)', async () => {
    // Ownership check returns empty (not found for this user)
    const ownershipChain = makeChain([])
    mockSelect.mockReturnValue(ownershipChain)

    const { deleteRecurringTemplate } = await import('@/app/actions/recurring')
    await expect(deleteRecurringTemplate('tmpl-other')).rejects.toThrow()
  })
})

// ─── updateRecurringTemplate ─────────────────────────────────────────────────

describe('updateRecurringTemplate', () => {
  it('calls db.update on the template (TC-08-10: future-only edit)', async () => {
    const ownershipChain = makeChain([{ id: 'tmpl-1' }])
    mockSelect.mockReturnValue(ownershipChain)

    const updateChain = makeChain([])
    mockUpdate.mockReturnValue(updateChain)

    const { updateRecurringTemplate } = await import('@/app/actions/recurring')
    await updateRecurringTemplate('tmpl-1', {
      amount: '600.00',
      subcategoryId: 'sub-1',
      startDate: '2024-01-15',
      interval: 'monthly',
      dayOfMonth: '15',
    })

    expect(mockUpdate).toHaveBeenCalledOnce()
    // Does NOT insert new expenses or touch past ones (TC-08-11)
    expect(mockInsert).not.toHaveBeenCalled()
  })
})

// ─── confirmRenewal ───────────────────────────────────────────────────────────

describe('confirmRenewal', () => {
  it('sets lastRenewedAt on existing template without creating new one (TC-09-05)', async () => {
    // Ownership + data: ownership returns the template
    const template = {
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
    }
    const chain = makeChain([template])
    mockSelect.mockReturnValue(chain)

    const updateChain = makeChain([])
    mockUpdate.mockReturnValue(updateChain)

    const { confirmRenewal } = await import('@/app/actions/recurring')
    await confirmRenewal('tmpl-1')

    // updates lastRenewedAt
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ lastRenewedAt: '2025-01-15' })
    )
    // does NOT insert a new template
    expect(mockInsert).not.toHaveBeenCalled()
  })
})

// ─── updateRenewal ────────────────────────────────────────────────────────────

describe('updateRenewal', () => {
  it('deactivates old template and inserts successor with new amount (TC-09-06/07/08)', async () => {
    const template = {
      id: 'tmpl-1',
      userId: 'user-1',
      subcategoryId: 'sub-1',
      amount: '500.00',
      startDate: '2024-01-15',
      interval: '6mo' as const,
      dayOfMonth: 15,
      active: true,
      lastRenewedAt: null,
      lastGeneratedDate: '2024-07-15',
    }
    const chain = makeChain([template])
    mockSelect.mockReturnValue(chain)

    const updateChain = makeChain([])
    mockUpdate.mockReturnValue(updateChain)

    const insertChain = makeChain([{ id: 'tmpl-2' }])
    mockInsert.mockReturnValue(insertChain)

    const { updateRenewal } = await import('@/app/actions/recurring')
    await updateRenewal('tmpl-1', '750.00')

    // Old template deactivated (TC-09-06)
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ active: false }))

    // Successor inserted (TC-09-07)
    expect(mockInsert).toHaveBeenCalledOnce()
    const insertArg = insertChain.values.mock.calls[0][0] as {
      amount: string; interval: string; dayOfMonth: number
    }
    // New amount (TC-09-07)
    expect(insertArg.amount).toBe('750.00')
    // Same interval and dayOfMonth (TC-09-08)
    expect(insertArg.interval).toBe('6mo')
    expect(insertArg.dayOfMonth).toBe(15)
  })
})
