/**
 * What actually went wrong, in words.
 *
 * Eighteen places in this app wrote `e instanceof Error ? e.message : fallback`
 * and every one of them threw the real reason away. Supabase rejects with a
 * plain object — `{ message, code, details, hint }` — which is not an Error, so
 * the check fails and the fallback wins every time.
 *
 * It cost an afternoon. "Could not save your routine. Try again." appeared on a
 * real phone during setup and told nobody anything: not the person stuck on it,
 * and not me reading the screenshot. I guessed at the cause twice.
 *
 * A message a person should not have to read is still a message somebody has to
 * debug. This returns the real one where there is one.
 */
export function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === 'object' && error !== null) {
    const shape = error as { message?: unknown; details?: unknown; hint?: unknown };
    for (const part of [shape.message, shape.details, shape.hint]) {
      if (typeof part === 'string' && part.trim().length > 0) return part;
    }
  }

  if (typeof error === 'string' && error.trim().length > 0) return error;
  return fallback;
}
