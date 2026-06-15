import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-07-01: createSubcategory calls db.insert with correct name + groupId
// TC-07-02: createSubcategory throws when groupId missing
// TC-07-03: renameSubcategory calls db.update with correct id + name

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSelect = vi.fn()
const mockWhere = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

vi.mock('@/lib/schema', () => ({
  subcategories: { id: 'id', groupId: 'group_id', name: 'name', __tableName: 'subcategory' },
  groups: { id: 'id', userId: 'user_id', __tableName: 'group' },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
  and: (...args: unknown[]) => ({ and: args }),
}))

beforeEach(() => {
  vi.clearAllMocks()

  // ownership check: select().from().innerJoin().where() → returns group row
  mockWhere.mockResolvedValue([{ id: 'g-1' }])
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({ where: mockWhere }),
      where: mockWhere,
    }),
  })

  mockInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'sub-1', name: 'Rent', groupId: 'g-1' }]),
    }),
  })

  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
  })
})

describe('createSubcategory Server Action', () => {
  it('TC-07-01: calls db.insert on subcategories table', async () => {
    const { createSubcategory } = await import('@/app/actions/subcategories')
    await createSubcategory('Rent', 'g-1')
    expect(mockInsert).toHaveBeenCalledOnce()
    const table = mockInsert.mock.calls[0][0]
    expect((table as { __tableName: string }).__tableName).toBe('subcategory')
  })

  it('TC-07-01: insert values include trimmed name and groupId', async () => {
    const { createSubcategory } = await import('@/app/actions/subcategories')
    await createSubcategory('  Rent  ', 'g-1')
    const valuesCall = mockInsert.mock.results[0].value.values
    const payload = valuesCall.mock.calls[0][0]
    expect(payload.name).toBe('Rent')
    expect(payload.groupId).toBe('g-1')
  })

  it('TC-07-02: throws without hitting DB when groupId is empty', async () => {
    const { createSubcategory } = await import('@/app/actions/subcategories')
    await expect(createSubcategory('Rent', '')).rejects.toThrow()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('throws without hitting DB when name is empty', async () => {
    const { createSubcategory } = await import('@/app/actions/subcategories')
    await expect(createSubcategory('', 'g-1')).rejects.toThrow()
    expect(mockInsert).not.toHaveBeenCalled()
  })
})

describe('renameSubcategory Server Action', () => {
  it('TC-07-03: calls db.update on subcategories table', async () => {
    const { renameSubcategory } = await import('@/app/actions/subcategories')
    await renameSubcategory('sub-1', 'Mortgage')
    expect(mockUpdate).toHaveBeenCalledOnce()
    const table = mockUpdate.mock.calls[0][0]
    expect((table as { __tableName: string }).__tableName).toBe('subcategory')
  })

  it('TC-07-03: set includes trimmed name', async () => {
    const { renameSubcategory } = await import('@/app/actions/subcategories')
    await renameSubcategory('sub-1', '  Mortgage  ')
    const setCall = mockUpdate.mock.results[0].value.set
    const payload = setCall.mock.calls[0][0]
    expect(payload.name).toBe('Mortgage')
  })

  it('throws without hitting DB when name is empty', async () => {
    const { renameSubcategory } = await import('@/app/actions/subcategories')
    await expect(renameSubcategory('sub-1', '')).rejects.toThrow()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
