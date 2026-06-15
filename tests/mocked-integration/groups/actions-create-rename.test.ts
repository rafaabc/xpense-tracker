import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-06-01: createGroup calls db.insert with correct name
// TC-06-02: renameGroup calls db.update with correct id + name
// TC-06-03/04: validation rejects empty/duplicate-case names (unit-tested separately;
//              here we verify the action throws on invalid input without hitting DB)

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockWhere = vi.fn().mockResolvedValue([])

vi.mock('@/lib/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

vi.mock('@/lib/schema', () => ({
  groups: { id: 'id', userId: 'user_id', name: 'name', __tableName: 'group' },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
  and: (...args: unknown[]) => ({ and: args }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'g-1', name: 'Casa', userId: 'user-1' }]),
    }),
  })
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({ where: mockWhere }),
  })
})

describe('createGroup Server Action', () => {
  it('TC-06-01: calls db.insert on groups table', async () => {
    const { createGroup } = await import('@/app/actions/groups')
    await createGroup('Casa')
    expect(mockInsert).toHaveBeenCalledOnce()
    const table = mockInsert.mock.calls[0][0]
    expect((table as { __tableName: string }).__tableName).toBe('group')
  })

  it('TC-06-01: insert values include name and userId', async () => {
    const { createGroup } = await import('@/app/actions/groups')
    await createGroup('  Casa  ')
    const valuesCall = mockInsert.mock.results[0].value.values
    const payload = valuesCall.mock.calls[0][0]
    expect(payload.name).toBe('Casa')
    expect(payload.userId).toBe('user-1')
  })

  it('TC-06-03: throws without hitting DB when name is empty', async () => {
    const { createGroup } = await import('@/app/actions/groups')
    await expect(createGroup('')).rejects.toThrow()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('TC-06-04: throws without hitting DB when name is whitespace only', async () => {
    const { createGroup } = await import('@/app/actions/groups')
    await expect(createGroup('   ')).rejects.toThrow()
    expect(mockInsert).not.toHaveBeenCalled()
  })
})

describe('renameGroup Server Action', () => {
  it('TC-06-02: calls db.update on groups table', async () => {
    const { renameGroup } = await import('@/app/actions/groups')
    await renameGroup('g-1', 'Renamed')
    expect(mockUpdate).toHaveBeenCalledOnce()
    const table = mockUpdate.mock.calls[0][0]
    expect((table as { __tableName: string }).__tableName).toBe('group')
  })

  it('TC-06-02: set includes trimmed name', async () => {
    const { renameGroup } = await import('@/app/actions/groups')
    await renameGroup('g-1', '  NewName  ')
    const setCall = mockUpdate.mock.results[0].value.set
    const payload = setCall.mock.calls[0][0]
    expect(payload.name).toBe('NewName')
  })

  it('TC-06-02: where clause includes group id and user id', async () => {
    const { renameGroup } = await import('@/app/actions/groups')
    await renameGroup('g-1', 'NewName')
    const whereArg = mockWhere.mock.calls[0][0]
    expect(JSON.stringify(whereArg)).toContain('g-1')
    expect(JSON.stringify(whereArg)).toContain('user-1')
  })

  it('throws without hitting DB when new name is empty', async () => {
    const { renameGroup } = await import('@/app/actions/groups')
    await expect(renameGroup('g-1', '')).rejects.toThrow()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
