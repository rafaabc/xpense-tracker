import { runCatchUpAllUsers } from '@/lib/recurrence-engine'
import { revalidatePath } from 'next/cache'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  await runCatchUpAllUsers(today)
  revalidatePath('/expenses')
  revalidatePath('/dashboard')

  return Response.json({ ok: true })
}
