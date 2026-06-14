'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { validateCurrency } from '@/lib/validations/currency'
import { revalidatePath } from 'next/cache'

export async function updateCurrency(currency: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  if (!validateCurrency(currency)) {
    throw new Error('Invalid currency')
  }

  await db.update(users).set({ currency }).where(eq(users.id, session.user.id))
  revalidatePath('/', 'layout')
}
