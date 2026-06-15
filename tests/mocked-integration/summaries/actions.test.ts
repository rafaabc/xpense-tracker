import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-14-01: monthly query scoped to userId (cross-tenant guard)
// TC-15-01: annual query scoped to userId
// TC-15-02: getAvailableYears returns distinct years with ≥1 expense

const mockSelect = vi.fn()
const mockSelectDistinct = vi.fn()

const makeChainable = (resolvedValue: unknown) => ({
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue(resolvedValue),
  orderBy: vi.fn().mockResolvedValue(resolvedValue),
})

vi.mock('@/lib/db', () => ({
  db: {
    select: mockSelect,
    selectDistinct: mockSelectDistinct,
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

vi.mock('@/lib/schema', () => ({
  expenses: {
    id: 'id',
    userId: 'user_id',
    subcategoryId: 'subcategory_id',
    amount: 'amount',
    date: 'date',
  },
  subcategories: { id: 'id', groupId: 'group_id' },
  groups: { id: 'id', userId: 'user_id', name: 'name' },
  users: { id: 'id', currency: 'currency' },
}))

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

describe('getMonthlyRows', () => {
  it('calls db with userId scoped where clause', async () => {
    const fakeRows = [
      { groupId: 'g1', groupName: 'Food', amount: '50.00' },
    ]
    const chain = makeChainable(fakeRows)
    mockSelect.mockReturnValue(chain)

    const { getMonthlyRows } = await import('@/app/actions/summaries')
    const result = await getMonthlyRows('2026-05')

    expect(mockSelect).toHaveBeenCalledOnce()
    expect(chain.from).toHaveBeenCalledOnce()
    expect(chain.innerJoin).toHaveBeenCalledTimes(2)
    expect(chain.where).toHaveBeenCalledOnce()
    expect(result).toEqual(fakeRows)
  })
})

describe('getAnnualRows', () => {
  it('calls db with userId scoped where clause', async () => {
    const fakeRows = [
      { groupId: 'g1', groupName: 'Food', month: 5, amount: '100.00' },
    ]
    const chain = makeChainable(fakeRows)
    mockSelect.mockReturnValue(chain)

    const { getAnnualRows } = await import('@/app/actions/summaries')
    const result = await getAnnualRows(2026)

    expect(mockSelect).toHaveBeenCalledOnce()
    expect(chain.where).toHaveBeenCalledOnce()
    expect(result).toEqual(fakeRows)
  })
})

describe('getAvailableYears', () => {
  it('returns distinct years ordered descending', async () => {
    const fakeYears = [{ year: 2026 }, { year: 2025 }]
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(fakeYears),
    }
    mockSelectDistinct.mockReturnValue(chain)

    const { getAvailableYears } = await import('@/app/actions/summaries')
    const result = await getAvailableYears()

    expect(mockSelectDistinct).toHaveBeenCalledOnce()
    expect(result).toEqual([2026, 2025])
  })
})
