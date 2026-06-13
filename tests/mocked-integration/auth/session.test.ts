import { describe, it, expect, vi, beforeAll } from 'vitest'

// TC-02-02: Session correctly established — user.id propagated from DB record

const { capturedCallbacks } = vi.hoisted(() => {
  const capturedCallbacks: Record<string, unknown> = {}
  return { capturedCallbacks }
})

vi.mock('next-auth', () => ({
  default: vi.fn((config: { callbacks?: Record<string, unknown> }) => {
    if (config.callbacks) Object.assign(capturedCallbacks, config.callbacks)
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }
  }),
}))
vi.mock('next-auth/providers/google', () => ({ default: { id: 'google' } }))
vi.mock('@auth/drizzle-adapter', () => ({ DrizzleAdapter: vi.fn().mockReturnValue({}) }))
vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/schema', () => ({
  users: {},
  accounts: {},
  sessions: {},
  verificationTokens: {},
}))

type SessionCb = (args: { session: { user: Record<string, unknown> }; user: { id: string } }) => unknown

describe('TC-02-02: Session callback — user ID injection', () => {
  beforeAll(async () => {
    await import('@/lib/auth')
  })

  it('copies user.id from the database record into the session', () => {
    const cb = capturedCallbacks.session as SessionCb
    const session = { user: { name: 'Alice', email: 'a@b.com' } }
    const result = cb({ session, user: { id: 'db-user-42' } }) as typeof session & { user: { id: string } }
    expect(result.user.id).toBe('db-user-42')
  })

  it('returns the same session object (mutation, not clone)', () => {
    const cb = capturedCallbacks.session as SessionCb
    const session = { user: {} }
    expect(cb({ session, user: { id: 'x' } })).toBe(session)
  })

  it('session.user.id is absent before callback (baseline)', () => {
    const session = { user: { name: 'Bob' } }
    expect((session.user as { id?: string }).id).toBeUndefined()
  })
})
