import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Cron route: app/api/cron/recurring/route.ts
// Tests: 401 on missing/bad bearer, success path calls engine + returns { ok: true }

const mockRunCatchUpAllUsers = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@/lib/recurrence-engine', () => ({
  runCatchUpAllUsers: mockRunCatchUpAllUsers,
  runCatchUp: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('GET /api/cron/recurring', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-cron-secret'
    mockRunCatchUpAllUsers.mockResolvedValue(undefined)
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/recurring/route')
    const req = new Request('http://localhost/api/cron/recurring')
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('Unauthorized')
  })

  it('returns 401 when bearer token does not match CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/recurring/route')
    const req = new Request('http://localhost/api/cron/recurring', {
      headers: { authorization: 'Bearer wrong-token' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for a completely missing Authorization value', async () => {
    const { GET } = await import('@/app/api/cron/recurring/route')
    const req = new Request('http://localhost/api/cron/recurring', {
      headers: { authorization: '' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('calls runCatchUpAllUsers and returns { ok: true } with valid bearer', async () => {
    const { GET } = await import('@/app/api/cron/recurring/route')
    const req = new Request('http://localhost/api/cron/recurring', {
      headers: { authorization: 'Bearer test-cron-secret' },
    })
    const res = await GET(req)
    expect(mockRunCatchUpAllUsers).toHaveBeenCalledOnce()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })

  it('does NOT call runCatchUpAllUsers when unauthorized', async () => {
    const { GET } = await import('@/app/api/cron/recurring/route')
    const req = new Request('http://localhost/api/cron/recurring', {
      headers: { authorization: 'Bearer bad' },
    })
    await GET(req)
    expect(mockRunCatchUpAllUsers).not.toHaveBeenCalled()
  })
})
