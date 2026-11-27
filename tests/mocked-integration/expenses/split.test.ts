import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-18-02/03/05: payer ownership, payer change, foreign subcategory on update
// TC-19-03..07: personal vs split share rows, foreign person, recompute, mode switch, atomic batch

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockBatch = vi.fn()

vi.mock('@/lib/db', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete, batch: mockBatch },
}))
vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'user-1' } }) }))
vi.mock('@/lib/schema', () => ({
  expenses: { id: 'id', userId: 'user_id', __table: 'expense' },
  expenseShares: { expenseId: 'expense_id', personId: 'person_id', shareBps: 'share_bps', __table: 'expense_share' },
  people: { id: 'id', userId: 'user_id', createdAt: 'created_at' },
  subcategories: { id: 'id', groupId: 'group_id' },
  groups: { id: 'id', userId: 'user_id' },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ eq: { col, val } }),
  and: (...args: unknown[]) => ({ and: args }),
  gte: vi.fn(),
  lte: vi.fn(),
  asc: (col: unknown) => ({ asc: col }),
  desc: (col: unknown) => ({ desc: col }),
  inArray: (col: unknown, val: unknown) => ({ inArray: { col, val } }),
  sql: vi.fn(),
}))

/** Queues one result per db.select() call, in order. */
function queueSelects(...results: unknown[][]) {
  for (const result of results) {
    mockSelect.mockImplementationOnce(() => {
      const query: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
      }
      for (const method of ['from', 'innerJoin', 'where', 'orderBy', 'limit', 'offset']) {
        query[method] = () => query
      }
      return query
    })
  }
}

interface Write { op: string; table: string; values?: unknown }
const tableOf = (t: unknown) => (t as { __table: string }).__table

const SUB = [{ id: 'sub-1' }]
const EXPENSE = [{ id: 'exp-1' }]
const PEOPLE = [{ id: 'p-self' }, { id: 'p-ana' }]
const base = { amount: '100.01', subcategoryId: 'sub-1', date: '2026-06-10' }
const split = {
  ...base,
  payerPersonId: 'p-ana',
  splitMode: 'split' as const,
  shares: [{ personId: 'p-self', percent: '60' }, { personId: 'p-ana', percent: '40' }],
}
const personal = { ...base, payerPersonId: 'p-ana', splitMode: 'personal' as const }

beforeEach(() => {
  vi.resetAllMocks()
  mockInsert.mockImplementation((t: unknown) => ({
    values: (values: unknown) => {
      const write = { op: 'insert', table: tableOf(t), values }
      return { ...write, returning: () => write }
    },
  }))
  mockUpdate.mockImplementation((t: unknown) => ({
    set: (values: unknown) => ({ where: () => ({ op: 'update', table: tableOf(t), values }) }),
  }))
  mockDelete.mockImplementation((t: unknown) => ({ where: () => ({ op: 'delete', table: tableOf(t) }) }))
  mockBatch.mockResolvedValue([[{ id: 'exp-1' }]])
})

const batched = () => mockBatch.mock.calls[0][0] as Write[]

describe('createExpense with payer and split', () => {
  it('TC-19-07: writes the expense and its shares in one batch', async () => {
    queueSelects(SUB, PEOPLE)
    const { createExpense } = await import('@/app/actions/expenses')
    await createExpense(split)

    expect(mockBatch).toHaveBeenCalledOnce()
    const [expense, shares] = batched()
    expect(expense.values).toMatchObject({ userId: 'user-1', payerPersonId: 'p-ana', splitMode: 'split' })
    const id = (expense.values as { id: string }).id
    expect(id).toEqual(expect.any(String))
    expect(shares.table).toBe('expense_share')
    expect(shares.values).toEqual([
      { expenseId: id, personId: 'p-self', shareBps: 6000, amount: '60.01' },
      { expenseId: id, personId: 'p-ana', shareBps: 4000, amount: '40.00' },
    ])
  })

  it('TC-19-03: writes no share rows for a personal expense', async () => {
    queueSelects(SUB, PEOPLE)
    const { createExpense } = await import('@/app/actions/expenses')
    await createExpense({ ...personal, shares: split.shares })
    expect(batched().map((w) => w.table)).toEqual(['expense'])
  })

  it('omits 0% shares', async () => {
    queueSelects(SUB, PEOPLE)
    const { createExpense } = await import('@/app/actions/expenses')
    await createExpense({
      ...split,
      shares: [{ personId: 'p-self', percent: '100' }, { personId: 'p-ana', percent: '0' }],
    })
    expect(batched()[1].values).toEqual([expect.objectContaining({ personId: 'p-self', amount: '100.01' })])
  })

  it.each([
    ['TC-18-02: a foreign payer', { ...split, payerPersonId: 'p-other' }],
    ['TC-19-04: a foreign share person', { ...split, shares: [{ personId: 'p-other', percent: '100' }] }],
    ['a repeated share person', { ...split, shares: [{ personId: 'p-ana', percent: '50' }, { personId: 'p-ana', percent: '50' }] }],
  ])('rejects %s', async (_label, payload) => {
    queueSelects(SUB, PEOPLE)
    const { createExpense } = await import('@/app/actions/expenses')
    await expect(createExpense(payload)).resolves.toEqual({ error: 'Person not found' })
    expect(mockBatch).not.toHaveBeenCalled()
  })

  it.each([
    ['a total below 100', [{ personId: 'p-self', percent: '99.99' }], 'Percentages must add up to 100'],
    ['no shares', [], 'Percentages must add up to 100'],
    ['a malformed percentage', [{ personId: 'p-self', percent: 'abc' }], 'Percentage must be'],
  ])('rejects a split with %s', async (_label, shares, message) => {
    const { createExpense } = await import('@/app/actions/expenses')
    await expect(createExpense({ ...split, shares })).resolves.toEqual({ error: expect.stringContaining(message) })
    expect(mockBatch).not.toHaveBeenCalled()
  })

  it('rejects an unknown split mode', async () => {
    const { createExpense } = await import('@/app/actions/expenses')
    await expect(createExpense({ ...base, payerPersonId: 'p-ana', splitMode: 'x' as 'split' }))
      .resolves.toEqual({ error: 'Invalid split mode' })
  })
})

describe('updateExpense with payer and split', () => {
  it('TC-18-03 / TC-19-05: saves the payer and recomputes share amounts', async () => {
    queueSelects(EXPENSE, SUB, PEOPLE)
    const { updateExpense } = await import('@/app/actions/expenses')
    await updateExpense('exp-1', { ...split, amount: '200,00' })

    const [update, remove, insert] = batched()
    expect(update.values).toMatchObject({ amount: '200.00', payerPersonId: 'p-ana', splitMode: 'split' })
    expect(remove).toMatchObject({ op: 'delete', table: 'expense_share' })
    expect((insert.values as { amount: string }[]).map((s) => s.amount)).toEqual(['120.00', '80.00'])
  })

  it('TC-19-06: switching to personal removes the share rows', async () => {
    queueSelects(EXPENSE, SUB, PEOPLE)
    const { updateExpense } = await import('@/app/actions/expenses')
    await updateExpense('exp-1', personal)
    expect(batched().map((w) => `${w.op} ${w.table}`)).toEqual(['update expense', 'delete expense_share'])
  })

  it('TC-18-05: rejects a subcategory of another user', async () => {
    queueSelects(EXPENSE, [])
    const { updateExpense } = await import('@/app/actions/expenses')
    await expect(updateExpense('exp-1', split)).resolves.toEqual({ error: 'Subcategory not found' })
    expect(mockBatch).not.toHaveBeenCalled()
  })
})

describe('listExpenses shares', () => {
  it('attaches stored percentages to split rows', async () => {
    queueSelects(
      [{ id: 'e1', splitMode: 'split' }, { id: 'e2', splitMode: 'personal' }],
      [{ count: 2 }],
      [{ expenseId: 'e1', personId: 'p-self', shareBps: 6000 }, { expenseId: 'e1', personId: 'p-ana', shareBps: 4000 }],
    )
    const { listExpenses } = await import('@/app/actions/expenses')
    const { rows } = await listExpenses({})
    expect(rows[0].shares).toEqual([{ personId: 'p-self', shareBps: 6000 }, { personId: 'p-ana', shareBps: 4000 }])
    expect(rows[1].shares).toEqual([])
  })
})
