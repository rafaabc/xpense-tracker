import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-20-04: only expenses of the selected month are read
// TC-20-06: balance queries are scoped to the session user

const mockSelect = vi.fn()
const mockAuth = vi.fn()
const mockEnsureSelf = vi.fn()
const mockListPeople = vi.fn()

vi.mock('@/lib/db', () => ({ db: { select: mockSelect } }))
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/people', () => ({ ensureSelfPerson: mockEnsureSelf, listPeople: mockListPeople }))
vi.mock('@/lib/schema', () => ({
  expenses: { id: 'id', userId: 'user_id', date: 'date' },
  expenseShares: { expenseId: 'expense_id', personId: 'person_id', amount: 'amount' },
}))
vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ eq: { col, val } }),
  and: (...args: unknown[]) => ({ and: args }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ sql: strings.join('?'), values }),
}))

const wheres: string[] = []

function queueSelects(...results: unknown[][]) {
  for (const result of results) {
    mockSelect.mockImplementationOnce(() => {
      const query = {
        from: () => query,
        innerJoin: () => query,
        where: (condition: unknown) => {
          wheres.push(JSON.stringify(condition))
          return Promise.resolve(result)
        },
      }
      return query
    })
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  wheres.length = 0
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
  mockListPeople.mockResolvedValue([
    { id: 'p-self', name: 'Rafa', isSelf: true },
    { id: 'p-ana', name: 'Ana', isSelf: false },
  ])
})

describe('getMonthlyBalance', () => {
  it('returns balances and transfers with names', async () => {
    queueSelects(
      [{ id: 'e1', amount: '100.00', payerPersonId: 'p-ana', splitMode: 'split' }],
      [
        { expenseId: 'e1', personId: 'p-self', amount: '50.00' },
        { expenseId: 'e1', personId: 'p-ana', amount: '50.00' },
      ],
    )
    const { getMonthlyBalance } = await import('@/app/actions/balance')
    await expect(getMonthlyBalance('2026-05')).resolves.toEqual({
      balances: [
        { personId: 'p-self', name: 'Rafa', isSelf: true, paid: '0.00', share: '50.00', net: '-50.00' },
        { personId: 'p-ana', name: 'Ana', isSelf: false, paid: '100.00', share: '50.00', net: '50.00' },
      ],
      transfers: [{ from: 'p-self', to: 'p-ana', amount: '50.00' }],
    })
    expect(mockEnsureSelf).toHaveBeenCalledWith('user-1')
    expect(mockListPeople).toHaveBeenCalledWith('user-1')
  })

  it('TC-20-04 / TC-20-06: filters both queries by user and month', async () => {
    queueSelects([], [])
    const { getMonthlyBalance } = await import('@/app/actions/balance')
    await getMonthlyBalance('2026-05')
    expect(wheres).toHaveLength(2)
    for (const where of wheres) {
      expect(where).toContain('user-1')
      expect(where).toContain("'YYYY-MM'")
      expect(where).toContain('2026-05')
    }
  })

  it.each(['2026-13', '2026-5', 'May', ''])('rejects the month %j', async (month) => {
    const { getMonthlyBalance } = await import('@/app/actions/balance')
    await expect(getMonthlyBalance(month)).rejects.toThrow('Invalid month')
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('rejects an unauthenticated caller', async () => {
    mockAuth.mockResolvedValue(null)
    const { getMonthlyBalance } = await import('@/app/actions/balance')
    await expect(getMonthlyBalance('2026-05')).rejects.toThrow('Unauthorized')
  })
})
