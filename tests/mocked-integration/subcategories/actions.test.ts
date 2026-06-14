import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-07-08: deleteSubcategory calls DB with correct ID
// TC-07-09: cascade deletes expenses (FK onDelete cascade)
// TC-07-12: no reassignParent method exists on the action module

const mockDelete = vi.fn()
const mockSelect = vi.fn()
const mockWhere = vi.fn()
const mockFrom = vi.fn()
const mockInnerJoin = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    delete: mockDelete,
    select: mockSelect,
    update: vi.fn().mockReturnThis(),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

vi.mock('@/lib/schema', () => ({
  subcategories: { id: 'id', groupId: 'group_id', __tableName: 'subcategory' },
  groups: { id: 'id', userId: 'user_id', __tableName: 'group' },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
  and: (...args: unknown[]) => ({ and: args }),
}))

describe('deleteSubcategory Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // ownership check chain: select().from().innerJoin().where()
    mockWhere.mockResolvedValue([{ id: 'sub-1' }])
    mockInnerJoin.mockReturnValue({ where: mockWhere })
    mockFrom.mockReturnValue({ innerJoin: mockInnerJoin })
    mockSelect.mockReturnValue({ from: mockFrom })

    // delete chain
    mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) })
  })

  it('TC-07-08: calls db.delete exactly once', async () => {
    const { deleteSubcategory } = await import('@/app/actions/subcategories')
    await deleteSubcategory('sub-1')
    expect(mockDelete).toHaveBeenCalledOnce()
  })

  it('TC-07-08: deletes from subcategories table', async () => {
    const { deleteSubcategory } = await import('@/app/actions/subcategories')
    await deleteSubcategory('sub-1')
    const table = mockDelete.mock.calls[0][0]
    expect((table as { __tableName: string }).__tableName).toBe('subcategory')
  })

  it('TC-07-09: no additional expense delete call — cascade handled by FK', async () => {
    const { deleteSubcategory } = await import('@/app/actions/subcategories')
    await deleteSubcategory('sub-1')
    expect(mockDelete).toHaveBeenCalledOnce()
  })

  it('TC-07-12: reassignParent does not exist on the module', async () => {
    const mod = await import('@/app/actions/subcategories')
    expect((mod as Record<string, unknown>).reassignParent).toBeUndefined()
  })
})
