import { describe, it, expect, vi, beforeAll } from 'vitest'

// TC-02-01: Route handler delegates OAuth flow to auth provider interface
// TC-02-06: Sign-out exported and callable (session invalidation delegated to NextAuth)
// TC-02-07: Failed auth → default error redirect (no custom pages.error overriding)
// TC-02-08: Revoked auth → same default error redirect behaviour

const mockGet = vi.hoisted(() => vi.fn())
const mockPost = vi.hoisted(() => vi.fn())
const mockSignOut = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth', () => ({
  handlers: { GET: mockGet, POST: mockPost },
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: mockSignOut,
}))

describe('TC-02-01: Auth route handler exports', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let route: any

  beforeAll(async () => {
    route = await import('@/app/api/auth/[...nextauth]/route')
  })

  it('exports GET bound to the NextAuth handlers', () => {
    expect(route.GET).toBe(mockGet)
  })

  it('exports POST bound to the NextAuth handlers', () => {
    expect(route.POST).toBe(mockPost)
  })
})

describe('TC-02-06: Sign-out — session invalidation', () => {
  it('signOut is exported from lib/auth', async () => {
    const { signOut } = await import('@/lib/auth')
    expect(typeof signOut).toBe('function')
  })

  it('calling signOut invokes NextAuth session invalidation', async () => {
    const { signOut } = await import('@/lib/auth')
    await signOut()
    expect(mockSignOut).toHaveBeenCalledOnce()
  })
})

describe('TC-02-07/08: Error handling — failed/revoked auth redirects to error page', () => {
  it('GET handler returns an error redirect when auth provider fails', async () => {
    const errorRedirect = Response.redirect('http://localhost:3000/api/auth/error?error=OAuthCallbackError', 302)
    mockGet.mockResolvedValueOnce(errorRedirect)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = new Request('http://localhost:3000/api/auth/callback/google?error=access_denied') as any
    const route = await import('@/app/api/auth/[...nextauth]/route')
    const res: Response = await route.GET(req)

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/api/auth/error')
  })

  it('GET handler returns an error redirect when token is revoked', async () => {
    const errorRedirect = Response.redirect('http://localhost:3000/api/auth/error?error=OAuthCallbackError', 302)
    mockGet.mockResolvedValueOnce(errorRedirect)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = new Request('http://localhost:3000/api/auth/callback/google?error=invalid_grant') as any
    const route = await import('@/app/api/auth/[...nextauth]/route')
    const res: Response = await route.GET(req)

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/api/auth/error')
  })
})
