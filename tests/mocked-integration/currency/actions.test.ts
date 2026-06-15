import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-05-01: updateCurrency calls db.update with valid currency value
// TC-05-02: rejects invalid currency without hitting DB

const mockUpdate = vi.fn()
const mockSet = vi.fn()
const mockWhere = vi.fn().mockResolvedValue([])

vi.mock('@/lib/db', () => ({
  db: { update: mockUpdate },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

vi.mock('@/lib/schema', () => ({
  users: { id: 'id', currency: 'currency', __tableName: 'user' },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockWhere.mockResolvedValue([])
  mockSet.mockReturnValue({ where: mockWhere })
  mockUpdate.mockReturnValue({ set: mockSet })
})

describe('updateCurrency Server Action', () => {
  it('TC-05-01: calls db.update with DKK', async () => {
    const { updateCurrency } = await import('@/app/actions/currency')
    await updateCurrency('DKK')
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockSet).toHaveBeenCalledWith({ currency: 'DKK' })
  })

  it('TC-05-01: calls db.update with BRL', async () => {
    const { updateCurrency } = await import('@/app/actions/currency')
    await updateCurrency('BRL')
    expect(mockSet).toHaveBeenCalledWith({ currency: 'BRL' })
  })

  it('TC-05-01: where clause scoped to session user id', async () => {
    const { updateCurrency } = await import('@/app/actions/currency')
    await updateCurrency('DKK')
    const whereArg = mockWhere.mock.calls[0][0]
    expect(JSON.stringify(whereArg)).toContain('user-1')
  })

  it('TC-05-02: throws for invalid currency without hitting DB', async () => {
    const { updateCurrency } = await import('@/app/actions/currency')
    await expect(updateCurrency('USD')).rejects.toThrow()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('TC-05-02: throws for empty string without hitting DB', async () => {
    const { updateCurrency } = await import('@/app/actions/currency')
    await expect(updateCurrency('')).rejects.toThrow()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
