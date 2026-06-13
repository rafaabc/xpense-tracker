import { describe, it, expect, vi, beforeAll } from 'vitest'

// TC-01-08: Only Google OAuth provider registered

const { capturedConfig } = vi.hoisted(() => {
  const capturedConfig: { providers?: unknown[] } = {}
  return { capturedConfig }
})

const mockGoogleProvider = vi.hoisted(() => ({ id: 'google', name: 'Google' }))

vi.mock('next-auth', () => ({
  default: vi.fn((config: { providers?: unknown[] }) => {
    Object.assign(capturedConfig, config)
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }
  }),
}))
vi.mock('next-auth/providers/google', () => ({ default: mockGoogleProvider }))
vi.mock('@auth/drizzle-adapter', () => ({ DrizzleAdapter: vi.fn().mockReturnValue({}) }))
vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/schema', () => ({
  users: {},
  accounts: {},
  sessions: {},
  verificationTokens: {},
}))

describe('TC-01-08: Auth provider configuration', () => {
  beforeAll(async () => {
    await import('@/lib/auth')
  })

  it('registers exactly one provider', () => {
    expect(capturedConfig.providers).toHaveLength(1)
  })

  it('the single provider is Google OAuth', () => {
    expect(capturedConfig.providers![0]).toBe(mockGoogleProvider)
  })
})
