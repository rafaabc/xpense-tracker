import { describe, it, expect, vi, beforeAll } from 'vitest'

// TC-02-09: Unauthenticated access to any protected route redirects to landing page

vi.mock('@/lib/auth', () => ({
  // Unwrap the HOF so proxy becomes the inner handler function directly
  auth: (fn: (req: unknown) => unknown) => fn,
}))

describe('TC-02-09: Route guard — unauthenticated redirect', () => {
  let proxy: (req: unknown) => Response | undefined

  beforeAll(async () => {
    const mod = await import('@/proxy')
    proxy = mod.proxy as typeof proxy
  })

  const makeReq = (pathname: string, authed: boolean) => ({
    auth: authed ? { user: { id: '1' } } : null,
    nextUrl: { pathname, origin: 'http://localhost:3000' },
  })

  it('redirects unauthenticated user on protected route', () => {
    const res = proxy(makeReq('/dashboard', false))
    expect(res).toBeInstanceOf(Response)
    expect(res!.status).toBe(302)
  })

  it('redirect target is the root landing page', () => {
    const res = proxy(makeReq('/groups', false))
    expect(res!.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('allows unauthenticated user on root', () => {
    expect(proxy(makeReq('/', false))).toBeUndefined()
  })

  it('allows authenticated user on protected route', () => {
    expect(proxy(makeReq('/dashboard', true))).toBeUndefined()
  })

  it('redirects any unauthed nested path', () => {
    const res = proxy(makeReq('/groups/123/subcategories', false))
    expect(res).toBeInstanceOf(Response)
  })
})
