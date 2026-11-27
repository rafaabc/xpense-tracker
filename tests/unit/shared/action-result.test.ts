import { describe, it, expect } from 'vitest'
import { ActionError, guard, unwrap, isUniqueViolation, rejectDuplicate } from '@/lib/action-result'

describe('guard and unwrap', () => {
  it('returns the message of an ActionError as a value', async () => {
    await expect(guard(async () => { throw new ActionError('Nope') })).resolves.toEqual({ error: 'Nope' })
  })

  it('lets unexpected errors keep throwing', async () => {
    await expect(guard(async () => { throw new Error('boom') })).rejects.toThrow('boom')
  })

  it('throws a returned failure on the client', () => {
    expect(() => unwrap({ error: 'Nope' })).toThrow('Nope')
  })

  it.each([undefined, null, { id: '1' }])('passes %o through', (value) => {
    expect(unwrap(value)).toBe(value)
  })
})

describe('unique violations', () => {
  it.each([{ code: '23505' }, { cause: { code: '23505' } }])('recognises %o', (error) => {
    expect(isUniqueViolation(error)).toBe(true)
  })

  it.each([null, new Error('boom'), { code: '23503' }])('ignores %o', (error) => {
    expect(isUniqueViolation(error)).toBe(false)
  })

  it('names the duplicate, and passes other results and errors through', async () => {
    await expect(rejectDuplicate(Promise.reject({ code: '23505' }), 'Taken')).rejects.toThrow('Taken')
    await expect(rejectDuplicate(Promise.reject(new Error('boom')), 'Taken')).rejects.toThrow('boom')
    await expect(rejectDuplicate(Promise.resolve(1), 'Taken')).resolves.toBe(1)
  })
})
