import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-16-01: self person created once (idempotent)
// TC-16-03: duplicate name rejected, case-insensitive
// TC-16-04: self person cannot be deleted
// TC-16-06: unreferenced person deleted
// TC-16-07: cross-tenant rename/delete rejected

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockBatch = vi.fn()
const mockAuth = vi.fn()

vi.mock('@/lib/db', () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete, batch: mockBatch },
}))
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/schema', () => ({
  people: {
    id: 'id', userId: 'user_id', name: 'name', isSelf: 'is_self',
    defaultShareBps: 'default_share_bps', createdAt: 'created_at',
  },
  users: { id: 'id', name: 'name' },
  expenses: { id: 'id', userId: 'user_id', payerPersonId: 'payer_person_id' },
  expenseShares: { expenseId: 'expense_id', personId: 'person_id' },
  recurringTemplates: { id: 'id', userId: 'user_id', payerPersonId: 'payer_person_id' },
  recurringTemplateShares: { templateId: 'template_id', personId: 'person_id' },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ eq: { col, val } }),
  and: (...args: unknown[]) => ({ and: args }),
  asc: (col: unknown) => ({ asc: col }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ sql: strings.join('?'), values }),
}))

const SELF = { id: 'p-self', userId: 'user-1', name: 'Rafa', isSelf: true, defaultShareBps: 10000 }
const ANA = { id: 'p-ana', userId: 'user-1', name: 'Ana', isSelf: false, defaultShareBps: 0 }

/** Queues one result per db.select() call, in order. */
function queueSelects(...results: unknown[][]) {
  for (const result of results) {
    mockSelect.mockImplementationOnce(() => {
      const query = {
        from: () => query,
        innerJoin: () => query,
        where: () => query,
        orderBy: () => query,
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
      }
      return query
    })
  }
}

let insertedValues: unknown[]
let updatedValues: unknown[]

beforeEach(() => {
  vi.resetAllMocks()
  insertedValues = []
  updatedValues = []
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
  mockInsert.mockImplementation(() => ({
    values: (v: unknown) => {
      insertedValues.push(v)
      return {
        returning: () => Promise.resolve([{ id: 'p-new' }]),
        onConflictDoNothing: () => Promise.resolve(),
      }
    },
  }))
  mockUpdate.mockImplementation(() => ({
    set: (v: unknown) => {
      updatedValues.push(v)
      return { where: (w: unknown) => ({ update: v, where: w }) }
    },
  }))
  mockDelete.mockImplementation(() => ({ where: (w: unknown) => ({ delete: w }) }))
  mockBatch.mockResolvedValue([])
})

describe('ensureSelfPerson', () => {
  it('TC-16-01: returns the existing self person without inserting', async () => {
    queueSelects([SELF])
    const { ensureSelfPerson } = await import('@/lib/people')
    await expect(ensureSelfPerson('user-1')).resolves.toEqual(SELF)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('TC-16-01: creates a self person named after the account with a 100% default', async () => {
    queueSelects([], [{ name: 'Rafa' }], [SELF])
    const { ensureSelfPerson } = await import('@/lib/people')
    await ensureSelfPerson('user-1')
    expect(insertedValues).toEqual([{ userId: 'user-1', name: 'Rafa', isSelf: true, defaultShareBps: 10000 }])
  })

  it('TC-16-01: falls back to "You" when the account has no name', async () => {
    queueSelects([], [{ name: null }], [SELF])
    const { ensureSelfPerson } = await import('@/lib/people')
    await ensureSelfPerson('user-1')
    expect(insertedValues[0]).toMatchObject({ name: 'You' })
  })
})

describe('createPerson', () => {
  it('inserts a trimmed name with a 0% default share, scoped to the session user', async () => {
    queueSelects([SELF], [])
    const { createPerson } = await import('@/app/actions/people')
    await createPerson('  Ana ')
    expect(insertedValues).toEqual([{ userId: 'user-1', name: 'Ana' }])
  })

  it('TC-16-02: rejects a blank name', async () => {
    const { createPerson } = await import('@/app/actions/people')
    await expect(createPerson('  ')).resolves.toEqual({ error: 'Name is required' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('TC-16-03: rejects a duplicate name regardless of case', async () => {
    queueSelects([SELF], [{ id: 'p-ana' }])
    const { createPerson } = await import('@/app/actions/people')
    await expect(createPerson('ANA')).resolves.toEqual({ error: 'A person with this name already exists' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects an unauthenticated caller', async () => {
    mockAuth.mockResolvedValue(null)
    const { createPerson } = await import('@/app/actions/people')
    await expect(createPerson('Ana')).resolves.toEqual({ error: 'Unauthorized' })
  })
})

describe('renamePerson', () => {
  it('renames an owned person', async () => {
    queueSelects([ANA], [])
    const { renamePerson } = await import('@/app/actions/people')
    await renamePerson('p-ana', ' Anna ')
    expect(updatedValues).toEqual([{ name: 'Anna' }])
  })

  it('allows changing only the case of the same person name', async () => {
    queueSelects([ANA], [{ id: 'p-ana' }])
    const { renamePerson } = await import('@/app/actions/people')
    await renamePerson('p-ana', 'ANA')
    expect(updatedValues).toEqual([{ name: 'ANA' }])
  })

  it('TC-16-03: rejects a name used by another person', async () => {
    queueSelects([ANA], [{ id: 'p-self' }])
    const { renamePerson } = await import('@/app/actions/people')
    await expect(renamePerson('p-ana', 'rafa')).resolves.toEqual({ error: 'A person with this name already exists' })
  })

  it('TC-16-07: rejects a person of another user', async () => {
    queueSelects([])
    const { renamePerson } = await import('@/app/actions/people')
    await expect(renamePerson('p-other', 'X')).resolves.toEqual({ error: 'Person not found' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('deletePerson', () => {
  it('TC-16-04: refuses to delete the self person', async () => {
    queueSelects([SELF])
    const { deletePerson } = await import('@/app/actions/people')
    await expect(deletePerson('p-self')).resolves.toEqual({ error: 'You cannot delete yourself' })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('TC-16-06: deletes an unreferenced person with no default share', async () => {
    queueSelects([ANA], [], [], [], [])
    const { deletePerson } = await import('@/app/actions/people')
    await deletePerson('p-ana')
    expect(mockBatch).toHaveBeenCalledOnce()
    expect(mockDelete).toHaveBeenCalledOnce()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('gives the default share of a deleted person back to self, so the total stays 100', async () => {
    queueSelects([{ ...ANA, defaultShareBps: 4000 }], [], [], [], [], [{ ...SELF, defaultShareBps: 6000 }])
    const { deletePerson } = await import('@/app/actions/people')
    await deletePerson('p-ana')
    expect(updatedValues).toEqual([{ defaultShareBps: 10000 }])
    expect(mockBatch.mock.calls[0][0]).toHaveLength(2)
  })

  it.each([
    ['payer of one expense', [{ id: 'e1' }], [], 'This person is used in 1 expense. Reassign them first.'],
    ['share on one expense', [], [{ id: 'e2' }], 'This person is used in 1 expense. Reassign them first.'],
    ['payer and share on overlapping expenses', [{ id: 'e1' }, { id: 'e2' }], [{ id: 'e2' }], 'This person is used in 2 expenses. Reassign them first.'],
  ])('TC-16-05: blocks deleting the %s', async (_label, paid, shared, message) => {
    queueSelects([ANA], paid, shared, [], [])
    const { deletePerson } = await import('@/app/actions/people')
    await expect(deletePerson('p-ana')).resolves.toEqual({ error: message })
    expect(mockBatch).not.toHaveBeenCalled()
  })

  it.each([
    ['recurring payer', [], [{ id: 't1' }], [], 'This person is used in 1 recurring expense. Reassign them first.'],
    ['recurring share', [], [], [{ id: 't2' }], 'This person is used in 1 recurring expense. Reassign them first.'],
    ['expenses and templates', [{ id: 'e1' }, { id: 'e2' }], [{ id: 't1' }, { id: 't2' }], [{ id: 't2' }],
      'This person is used in 2 expenses and 2 recurring expenses. Reassign them first.'],
  ])('TC-16-05: blocks deleting a %s', async (_label, paid, templatePaid, templateShared, message) => {
    queueSelects([ANA], paid, [], templatePaid, templateShared)
    const { deletePerson } = await import('@/app/actions/people')
    await expect(deletePerson('p-ana')).resolves.toEqual({ error: message })
    expect(mockBatch).not.toHaveBeenCalled()
  })

  it('TC-16-07: rejects a person of another user', async () => {
    queueSelects([])
    const { deletePerson } = await import('@/app/actions/people')
    await expect(deletePerson('p-other')).resolves.toEqual({ error: 'Person not found' })
    expect(mockDelete).not.toHaveBeenCalled()
  })
})

describe('updateDefaultSplit', () => {
  it('stores each share in one atomic batch', async () => {
    queueSelects([{ id: 'p-self' }, { id: 'p-ana' }])
    const { updateDefaultSplit } = await import('@/app/actions/people')
    await updateDefaultSplit([
      { personId: 'p-self', percent: '60' },
      { personId: 'p-ana', percent: '40,00' },
    ])
    expect(updatedValues).toEqual([{ defaultShareBps: 6000 }, { defaultShareBps: 4000 }])
    expect(mockBatch).toHaveBeenCalledOnce()
    // TC-17-04: only people are written; stored expense shares stay as they are
    expect(mockUpdate.mock.calls.every(([table]) => 'defaultShareBps' in table)).toBe(true)
    expect(mockDelete).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('TC-17-02: rejects a total other than 100', async () => {
    queueSelects([{ id: 'p-self' }, { id: 'p-ana' }])
    const { updateDefaultSplit } = await import('@/app/actions/people')
    await expect(updateDefaultSplit([
      { personId: 'p-self', percent: '60' },
      { personId: 'p-ana', percent: '39.99' },
    ])).resolves.toEqual({ error: 'Percentages must add up to 100' })
    expect(mockBatch).not.toHaveBeenCalled()
  })

  it('TC-17-01: rejects a malformed percentage', async () => {
    const { updateDefaultSplit } = await import('@/app/actions/people')
    await expect(updateDefaultSplit([{ personId: 'p-self', percent: 'abc' }])).resolves.toEqual({ error: expect.stringContaining('Percentage must be') })
  })

  it.each([
    ['a foreign person', ['p-self', 'p-other']],
    ['a missing person', ['p-self']],
    ['a repeated person', ['p-self', 'p-self']],
  ])('TC-16-07: rejects %s', async (_label, ids) => {
    queueSelects([{ id: 'p-self' }, { id: 'p-ana' }])
    const { updateDefaultSplit } = await import('@/app/actions/people')
    const percent = ids.length === 1 ? '100' : '50'
    await expect(updateDefaultSplit(ids.map((personId) => ({ personId, percent }))))
      .resolves.toEqual({ error: 'Person not found' })
    expect(mockBatch).not.toHaveBeenCalled()
  })
})
