import { describe, it, expect, vi, beforeEach } from 'vitest'

// TC-21-01: engine copies payer, mode and shares to each generated expense
// TC-21-03: renewal successor keeps payer and split
// TC-21-04: template payer and share people must belong to the user
// TC-21-05/06: apply to the current month on / off

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
  recurringTemplates: { id: 'id', userId: 'user_id', active: 'active', __table: 'template' },
  recurringTemplateShares: { templateId: 'template_id', personId: 'person_id', shareBps: 'share_bps', __table: 'template_share' },
  expenses: { id: 'id', userId: 'user_id', date: 'date', recurringTemplateId: 'recurring_template_id', __table: 'expense' },
  expenseShares: { expenseId: 'expense_id', __table: 'expense_share' },
  people: { id: 'id', userId: 'user_id', createdAt: 'created_at' },
  subcategories: { id: 'id', groupId: 'group_id' },
  groups: { id: 'id', userId: 'user_id' },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ eq: { col, val } }),
  and: (...args: unknown[]) => ({ and: args }),
  asc: (col: unknown) => ({ asc: col }),
  inArray: (col: unknown, val: unknown) => ({ inArray: { col, val } }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ sql: strings.join('?'), values }),
}))

const wheres: string[] = []

function queueSelects(...results: unknown[][]) {
  for (const result of results) {
    mockSelect.mockImplementationOnce(() => {
      const query: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
      }
      for (const method of ['from', 'innerJoin', 'orderBy']) query[method] = () => query
      query.where = (condition: unknown) => {
        wheres.push(JSON.stringify(condition))
        return query
      }
      return query
    })
  }
}

interface Write { op: string; table: string; values?: unknown }
const tableOf = (t: unknown) => (t as { __table: string }).__table
const batched = () => mockBatch.mock.calls[0][0] as Write[]
const summary = () => batched().map((w) => `${w.op} ${w.table}`)
const valuesOf = (op: string, table: string) =>
  batched().filter((w) => w.op === op && w.table === table).map((w) => w.values)

beforeEach(() => {
  vi.resetAllMocks()
  wheres.length = 0
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
  mockBatch.mockResolvedValue([[{ id: 'tmpl-new' }]])
})

const SUB = [{ id: 'sub-1' }]
const PEOPLE = [{ id: 'p-self' }, { id: 'p-ana' }]
const TEMPLATE = {
  id: 'tmpl-1', userId: 'user-1', subcategoryId: 'sub-1', amount: '100.01',
  startDate: '2024-01-15', interval: 'monthly', dayOfMonth: 15, active: true,
  lastRenewedAt: null, lastGeneratedDate: '2024-01-15', payerPersonId: 'p-ana', splitMode: 'split',
}
const STORED_SHARES = [{ personId: 'p-self', shareBps: 6000 }, { personId: 'p-ana', shareBps: 4000 }]
const payload = {
  amount: '100.00', subcategoryId: 'sub-1', startDate: '2024-01-15', interval: 'monthly', dayOfMonth: '15',
  payerPersonId: 'p-ana', splitMode: 'split' as const,
  shares: [{ personId: 'p-self', percent: '50' }, { personId: 'p-ana', percent: '50' }],
}

describe('recurrence engine', () => {
  it('TC-21-01: copies template link, payer, mode and shares to every generated expense', async () => {
    queueSelects([TEMPLATE], STORED_SHARES)
    const { runCatchUp } = await import('@/lib/recurrence-engine')
    await runCatchUp('user-1', '2024-03-20')

    expect(summary()).toEqual(['insert expense', 'insert expense_share', 'update template'])
    const [rows] = valuesOf('insert', 'expense') as [{ id: string }[]]
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row).toMatchObject({ recurringTemplateId: 'tmpl-1', payerPersonId: 'p-ana', splitMode: 'split' })
    }
    expect(valuesOf('insert', 'expense_share')[0]).toEqual(
      rows.flatMap((row) => [
        { expenseId: row.id, personId: 'p-self', shareBps: 6000, amount: '60.01' },
        { expenseId: row.id, personId: 'p-ana', shareBps: 4000, amount: '40.00' },
      ]),
    )
    expect(valuesOf('update', 'template')).toEqual([{ lastGeneratedDate: '2024-03-15' }])
  })

  it('writes no shares for a personal template', async () => {
    queueSelects([{ ...TEMPLATE, splitMode: 'personal', payerPersonId: null }])
    const { runCatchUp } = await import('@/lib/recurrence-engine')
    await runCatchUp('user-1', '2024-02-20')
    expect(summary()).toEqual(['insert expense', 'update template'])
  })
})

describe('template create and update', () => {
  it('stores the template and its shares atomically', async () => {
    queueSelects(SUB, PEOPLE)
    const { createRecurringTemplate } = await import('@/app/actions/recurring')
    await createRecurringTemplate(payload)

    expect(summary()).toEqual(['insert template', 'insert template_share'])
    const template = valuesOf('insert', 'template')[0] as { id: string }
    expect(template).toMatchObject({ userId: 'user-1', payerPersonId: 'p-ana', splitMode: 'split' })
    expect(valuesOf('insert', 'template_share')[0]).toEqual([
      { templateId: template.id, personId: 'p-self', shareBps: 5000 },
      { templateId: template.id, personId: 'p-ana', shareBps: 5000 },
    ])
  })

  it.each([
    ['payer', { ...payload, payerPersonId: 'p-other' }],
    ['share person', { ...payload, shares: [{ personId: 'p-other', percent: '100' }] }],
  ])('TC-21-04: rejects a foreign %s on create and update', async (_label, bad) => {
    const { createRecurringTemplate, updateRecurringTemplate } = await import('@/app/actions/recurring')
    queueSelects(SUB, PEOPLE)
    await expect(createRecurringTemplate(bad)).resolves.toEqual({ error: 'Person not found' })
    queueSelects([TEMPLATE], SUB, PEOPLE)
    await expect(updateRecurringTemplate('tmpl-1', bad)).resolves.toEqual({ error: 'Person not found' })
    expect(mockBatch).not.toHaveBeenCalled()
  })

  it('rejects a split that does not total 100', async () => {
    const { createRecurringTemplate } = await import('@/app/actions/recurring')
    await expect(createRecurringTemplate({ ...payload, shares: [{ personId: 'p-ana', percent: '99' }] }))
      .resolves.toEqual({ error: 'Percentages must add up to 100' })
  })

  it('TC-21-06: without the option, no generated expense changes', async () => {
    queueSelects([TEMPLATE], SUB, PEOPLE)
    const { updateRecurringTemplate } = await import('@/app/actions/recurring')
    await updateRecurringTemplate('tmpl-1', payload)
    expect(summary()).toEqual(['update template', 'delete template_share', 'insert template_share'])
  })

  it('TC-21-05: applies payer, mode and recomputed shares to this month of the template', async () => {
    queueSelects([TEMPLATE], SUB, PEOPLE, [{ id: 'e1', amount: '80.00' }])
    const { updateRecurringTemplate } = await import('@/app/actions/recurring')
    await updateRecurringTemplate('tmpl-1', payload, { applyToCurrentMonth: true })

    const month = new Date().toISOString().slice(0, 7)
    const filter = wheres.at(-1)!
    expect(filter).toContain('user-1')
    expect(filter).toContain('tmpl-1')
    expect(filter).toContain(month)

    expect(summary()).toEqual([
      'update template', 'delete template_share', 'insert template_share',
      'update expense', 'delete expense_share', 'insert expense_share',
    ])
    // Only payer and mode change; the generated amount stays
    expect(valuesOf('update', 'expense')).toEqual([{ payerPersonId: 'p-ana', splitMode: 'split' }])
    expect(valuesOf('insert', 'expense_share')[0]).toEqual([
      { expenseId: 'e1', personId: 'p-self', shareBps: 5000, amount: '40.00' },
      { expenseId: 'e1', personId: 'p-ana', shareBps: 5000, amount: '40.00' },
    ])
  })

  it('applying a personal template removes the shares of this month', async () => {
    queueSelects([TEMPLATE], SUB, PEOPLE, [{ id: 'e1', amount: '80.00' }])
    const { updateRecurringTemplate } = await import('@/app/actions/recurring')
    await updateRecurringTemplate('tmpl-1', { ...payload, splitMode: 'personal' }, { applyToCurrentMonth: true })
    expect(summary()).toEqual(['update template', 'delete template_share', 'update expense', 'delete expense_share'])
  })
})

describe('updateRenewal', () => {
  it('TC-21-03: the successor keeps payer and split, and the old template releases them', async () => {
    queueSelects([TEMPLATE], STORED_SHARES)
    const { updateRenewal } = await import('@/app/actions/recurring')
    await updateRenewal('tmpl-1', '120.00')

    expect(valuesOf('update', 'template')).toEqual([{ active: false, payerPersonId: null, splitMode: 'personal' }])
    const successor = valuesOf('insert', 'template')[0] as { id: string }
    expect(successor).toMatchObject({ amount: '120.00', payerPersonId: 'p-ana', splitMode: 'split' })
    expect(valuesOf('insert', 'template_share')[0]).toEqual(
      STORED_SHARES.map((s) => ({ templateId: successor.id, ...s })),
    )
    expect(summary()).toContain('delete template_share')
  })
})
