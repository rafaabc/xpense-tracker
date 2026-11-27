import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-08-05/06 and TC-09-01: listing templates and due renewals; server-side validation

const mockSelect = vi.fn()
const mockAuth = vi.fn()

vi.mock('@/lib/db', () => ({ db: { select: mockSelect } }))
vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

function queueSelects(...results: unknown[][]) {
  for (const result of results) {
    mockSelect.mockImplementationOnce(() => {
      const query = { from: () => query, innerJoin: () => query, where: () => Promise.resolve(result) }
      return query
    })
  }
}

const row = (id: string, startDate: string, splitMode: 'personal' | 'split') => ({
  id, userId: 'user-1', amount: '10.00', subcategoryId: 's1', subcategoryName: 'Rent', groupId: 'g1',
  groupName: 'Casa', startDate, interval: 'monthly', dayOfMonth: 1, active: true,
  lastRenewedAt: null, lastGeneratedDate: null, payerPersonId: null, splitMode,
})

beforeEach(() => {
  vi.resetAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
})

describe('listRecurringTemplates', () => {
  it('adds the next date and the shares of split templates', async () => {
    queueSelects(
      [row('t1', '2024-01-01', 'split'), row('t2', '2024-01-01', 'personal')],
      [{ templateId: 't1', personId: 'p1', shareBps: 10000 }],
    )
    const { listRecurringTemplates } = await import('@/app/actions/recurring')
    const [split, personal] = await listRecurringTemplates()
    expect(split.shares).toEqual([{ personId: 'p1', shareBps: 10000 }])
    expect(personal.shares).toEqual([])
    expect(split.nextExecutionDate).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('skips the share query when nothing is split', async () => {
    queueSelects([row('t1', '2024-01-01', 'personal')])
    const { listRecurringTemplates } = await import('@/app/actions/recurring')
    await listRecurringTemplates()
    expect(mockSelect).toHaveBeenCalledOnce()
  })

  it('rejects an unauthenticated caller', async () => {
    mockAuth.mockResolvedValue(null)
    const { listRecurringTemplates } = await import('@/app/actions/recurring')
    await expect(listRecurringTemplates()).rejects.toThrow('Unauthorized')
  })
})

describe('getDueRenewals', () => {
  it('returns only templates older than a year', async () => {
    queueSelects([row('old', '2020-01-01', 'personal'), row('new', '2999-01-01', 'personal')])
    const { getDueRenewals } = await import('@/app/actions/recurring')
    expect((await getDueRenewals()).map((t) => t.id)).toEqual(['old'])
  })
})

describe('server-side validation', () => {
  const payload = {
    amount: '10', subcategoryId: 's1', startDate: '2024-01-01', interval: 'monthly', dayOfMonth: '1',
    payerPersonId: 'p1', splitMode: 'personal' as const,
  }

  it.each([{ amount: '0' }, { startDate: '' }, { interval: 'weekly' }, { dayOfMonth: '32' }])(
    'rejects %o on create',
    async (bad) => {
      const { createRecurringTemplate } = await import('@/app/actions/recurring')
      await expect(createRecurringTemplate({ ...payload, ...bad })).resolves.toHaveProperty('error')
      expect(mockSelect).not.toHaveBeenCalled()
    },
  )

  it.each([{ amount: '0' }, { interval: 'weekly' }, { dayOfMonth: '32' }, { splitMode: 'half' as never }])(
    'rejects %o on update',
    async (bad) => {
      const { updateRecurringTemplate } = await import('@/app/actions/recurring')
      await expect(updateRecurringTemplate('t1', { ...payload, ...bad })).resolves.toHaveProperty('error')
      expect(mockSelect).not.toHaveBeenCalled()
    },
  )

  it('rejects an invalid renewal amount and a foreign subcategory', async () => {
    const { updateRenewal, createRecurringTemplate } = await import('@/app/actions/recurring')
    await expect(updateRenewal('t1', '-1')).resolves.toHaveProperty('error')
    queueSelects([])
    await expect(createRecurringTemplate(payload)).resolves.toEqual({ error: 'Subcategory not found' })
  })
})
