import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-10-11/12: createExpense calls db.insert on expenses table with validated payload
// TC-12-04/05: updateExpense calls db.update (not insert) with existing record id
// TC-12-08/09: updateExpense rejects cross-tenant (not user's expense)
// TC-13-02/03: deleteExpense issues hard db.delete; no soft-delete path
// TC-13-08/09: deleteExpense rejects cross-tenant
// TC-11-01: listExpenses scoped to session user id
// TC-11-06: listExpenses default order is date descending
// TC-11-07: from/to date filter passed to where clause
// TC-11-08/09: group and subcategory filters passed to where clause
// TC-11-10: combined filters (from + to + group + subcategory) all applied together

// --- mock db ---
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockSelect = vi.fn()

const chainable = {
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
  returning: vi.fn().mockResolvedValue([{ id: 'exp-1', amount: '10.00', date: '2026-06-15', subcategoryId: 'sub-1', userId: 'user-1' }]),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue([]),
}

mockInsert.mockReturnValue(chainable)
mockUpdate.mockReturnValue(chainable)
mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) })
mockSelect.mockReturnValue(chainable)

vi.mock('@/lib/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

vi.mock('@/lib/schema', () => ({
  expenses: { id: 'id', userId: 'user_id', subcategoryId: 'subcategory_id', amount: 'amount', date: 'date', __tableName: 'expense' },
  subcategories: { id: 'id', groupId: 'group_id', __tableName: 'subcategory' },
  groups: { id: 'id', userId: 'user_id', __tableName: 'group' },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ eq: { col, val } }),
  and: (...args: unknown[]) => ({ and: args }),
  gte: (col: unknown, val: unknown) => ({ gte: { col, val } }),
  lte: (col: unknown, val: unknown) => ({ lte: { col, val } }),
  desc: (col: unknown) => ({ desc: col }),
  sql: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockInsert.mockReturnValue({ ...chainable, values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'exp-1' }]) }) })
  mockUpdate.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) })
  mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) })
  // select returns the expense owned by user-1 by default
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ id: 'exp-1', userId: 'user-1' }]),
    orderBy: vi.fn().mockResolvedValue([{ id: 'exp-1' }]),
  })
})

// ---- createExpense ----
describe('createExpense', () => {
  it('TC-10-12: calls db.insert on the expenses table', async () => {
    const { createExpense } = await import('@/app/actions/expenses')
    await createExpense({ amount: '25.50', subcategoryId: 'sub-1', date: '2026-06-10' })
    expect(mockInsert).toHaveBeenCalledOnce()
    const tableArg = mockInsert.mock.calls[0][0]
    expect((tableArg as { __tableName: string }).__tableName).toBe('expense')
  })

  it('TC-10-11: throws validation error for invalid amount', async () => {
    const { createExpense } = await import('@/app/actions/expenses')
    await expect(createExpense({ amount: '0', subcategoryId: 'sub-1', date: '2026-06-10' }))
      .rejects.toThrow()
  })

  it('TC-10-04 (action): throws for future date', async () => {
    const { createExpense } = await import('@/app/actions/expenses')
    await expect(createExpense({ amount: '10.00', subcategoryId: 'sub-1', date: '2099-01-01' }))
      .rejects.toThrow()
  })
})

// ---- updateExpense ----
describe('updateExpense', () => {
  it('TC-12-04/05: calls db.update (not db.insert) with existing record id', async () => {
    const { updateExpense } = await import('@/app/actions/expenses')
    await updateExpense('exp-1', { amount: '30.00', subcategoryId: 'sub-1', date: '2026-06-01' })
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('TC-12-08/09: rejects when expense not owned by session user', async () => {
    // select returns empty — expense doesn't belong to user-1
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
      orderBy: vi.fn().mockResolvedValue([]),
    })
    const { updateExpense } = await import('@/app/actions/expenses')
    await expect(updateExpense('exp-other', { amount: '30.00', subcategoryId: 'sub-1', date: '2026-06-01' }))
      .rejects.toThrow()
  })
})

// ---- deleteExpense ----
describe('deleteExpense', () => {
  it('TC-13-02: calls db.delete once (hard delete)', async () => {
    const { deleteExpense } = await import('@/app/actions/expenses')
    await deleteExpense('exp-1')
    expect(mockDelete).toHaveBeenCalledOnce()
  })

  it('TC-13-03: no soft-delete path — db.update never called', async () => {
    const { deleteExpense } = await import('@/app/actions/expenses')
    await deleteExpense('exp-1')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('TC-13-08/09: rejects when expense not owned by session user', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
      orderBy: vi.fn().mockResolvedValue([]),
    })
    const { deleteExpense } = await import('@/app/actions/expenses')
    await expect(deleteExpense('exp-other')).rejects.toThrow()
  })
})

// ---- listExpenses ----
describe('listExpenses', () => {
  it('TC-11-01: query is scoped to session user id', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    mockSelect.mockReturnValue(selectChain)

    const { listExpenses } = await import('@/app/actions/expenses')
    await listExpenses({})

    // where should be called with an arg including the userId
    const whereArg = selectChain.where.mock.calls[0][0]
    expect(JSON.stringify(whereArg)).toContain('user-1')
  })

  it('TC-11-06: orderBy called with date descending', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    mockSelect.mockReturnValue(selectChain)

    const { listExpenses } = await import('@/app/actions/expenses')
    await listExpenses({})

    expect(selectChain.orderBy).toHaveBeenCalledOnce()
    const orderArg = selectChain.orderBy.mock.calls[0][0]
    // desc() wraps the date column
    expect(JSON.stringify(orderArg)).toContain('desc')
  })

  it('TC-11-07: from/to date filter passed to where clause', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    mockSelect.mockReturnValue(selectChain)

    const { listExpenses } = await import('@/app/actions/expenses')
    await listExpenses({ from: '2026-01-01', to: '2026-06-15' })

    const whereArg = selectChain.where.mock.calls[0][0]
    const serialized = JSON.stringify(whereArg)
    expect(serialized).toContain('2026-01-01')
    expect(serialized).toContain('2026-06-15')
  })

  it('TC-11-08/09: group and subcategory filters passed to where clause', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    mockSelect.mockReturnValue(selectChain)

    const { listExpenses } = await import('@/app/actions/expenses')
    await listExpenses({ group: 'grp-1', subcategory: 'sub-1' })

    const whereArg = selectChain.where.mock.calls[0][0]
    const serialized = JSON.stringify(whereArg)
    expect(serialized).toContain('grp-1')
    expect(serialized).toContain('sub-1')
  })

  it('TC-11-10: all four filters applied together compose the where clause', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    }
    mockSelect.mockReturnValue(selectChain)

    const { listExpenses } = await import('@/app/actions/expenses')
    await listExpenses({ from: '2026-01-01', to: '2026-06-30', group: 'grp-1', subcategory: 'sub-1' })

    const whereArg = selectChain.where.mock.calls[0][0]
    const serialized = JSON.stringify(whereArg)
    expect(serialized).toContain('2026-01-01')
    expect(serialized).toContain('2026-06-30')
    expect(serialized).toContain('grp-1')
    expect(serialized).toContain('sub-1')
  })
})
