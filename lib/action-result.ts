// A production build hides the message of anything a Server Action throws, so
// mutations return expected errors as values instead.

/** An error whose message is meant for the user. */
export class ActionError extends Error {}

export interface ActionFailure {
  error: string
}

/** Runs a Server Action body, turning ActionError into a returned failure. */
export async function guard<T>(body: () => Promise<T>): Promise<T | ActionFailure> {
  try {
    return await body()
  } catch (e) {
    if (e instanceof ActionError) return { error: e.message }
    throw e
  }
}

/** Client side: throws the returned failure so callers handle one error path. */
export function unwrap<T>(result: T | ActionFailure): T {
  if (typeof result === 'object' && result !== null && 'error' in result) {
    throw new Error((result as ActionFailure).error)
  }
  return result as T
}

/** True for a Postgres unique index violation, as is or wrapped by Drizzle. */
export function isUniqueViolation(e: unknown): boolean {
  const error = e as { code?: string; cause?: { code?: string } } | null
  return error?.code === '23505' || error?.cause?.code === '23505'
}

/** Runs a write, naming the duplicate when a unique index rejects it. */
export async function rejectDuplicate<T>(write: PromiseLike<T>, message: string): Promise<T> {
  try {
    return await write
  } catch (e) {
    if (isUniqueViolation(e)) throw new ActionError(message)
    throw e
  }
}
