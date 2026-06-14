import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-06-07: deleteGroup calls DB with correct ID
// TC-06-08: cascade deletes subcategories (FK onDelete cascade — action just deletes group row)
// TC-06-09: cascade deletes expenses (same FK cascade chain)
// TC-06-10: deletes regardless of existing linked expenses (no block on expense count)

const mockDelete = vi.fn().mockReturnThis()
const mockWhere = vi.fn().mockResolvedValue([])

vi.mock('@/lib/db', () => ({
  db: {
    delete: mockDelete,
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  },
}))

// Capture what table delete was called with
let deletedFromTable: unknown
mockDelete.mockImplementation((table: unknown) => {
  deletedFromTable = table
  return { where: mockWhere }
})

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

vi.mock('@/lib/schema', () => {
  const groups = { id: 'id', userId: 'user_id', __tableName: 'group' }
  return { groups, subcategories: {}, expenses: {} }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// eq and and are used for where clause construction — return a plain descriptor
vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
  and: (...args: unknown[]) => ({ and: args }),
}))

describe('deleteGroup Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDelete.mockImplementation((table: unknown) => {
      deletedFromTable = table
      return { where: mockWhere }
    })
  })

  it('TC-06-07: calls db.delete on the groups table', async () => {
    const { deleteGroup } = await import('@/app/actions/groups')
    await deleteGroup('group-abc')
    expect(mockDelete).toHaveBeenCalledOnce()
    expect((deletedFromTable as { __tableName: string }).__tableName).toBe('group')
  })

  it('TC-06-07: where clause includes the provided group id and user id', async () => {
    const { deleteGroup } = await import('@/app/actions/groups')
    await deleteGroup('group-abc')
    const whereArg = mockWhere.mock.calls[0][0]
    // and() wraps eq(groups.id, id) + eq(groups.userId, userId)
    expect(whereArg).toMatchObject({
      and: [
        { val: 'group-abc' },
        { val: 'user-1' },
      ],
    })
  })

  it('TC-06-08/09: no extra subcategory/expense delete calls — cascade handled by FK', async () => {
    const { deleteGroup } = await import('@/app/actions/groups')
    await deleteGroup('group-abc')
    // Only ONE db.delete call — FK cascade does the rest
    expect(mockDelete).toHaveBeenCalledOnce()
  })

  it('TC-06-10: does not check expense count before deleting — hard delete unconditional', async () => {
    const { db } = await import('@/lib/db')
    const { deleteGroup } = await import('@/app/actions/groups')
    await deleteGroup('group-abc')
    // db.select should never be called — no count check
    expect((db as unknown as { select?: unknown }).select).toBeUndefined()
    expect(mockDelete).toHaveBeenCalledOnce()
  })
})
