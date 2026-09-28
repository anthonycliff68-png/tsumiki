/**
 * The emailed sign-in code.
 *
 * A magic link has to come back to a redirect address, and on a real phone in
 * Expo Go that address changes every session and is not in the project's
 * allow-list — so the link has nowhere to land. The same email carries a code,
 * which needs no deep link at all.
 *
 * How long that code is, though, is not ours to decide. Supabase allows
 * anything from six to ten digits and the length is a project setting the app
 * has no way to read — so it accepts the whole range rather than assuming six
 * and refusing to hold a longer one. Getting this wrong is invisible until it
 * locks someone out of their own account.
 */

/** Supabase's own bounds for an email OTP. */
export const CODE_MIN = 6;
export const CODE_MAX = 10;

/** Digits only, never longer than a code could be. Paste and autofill come through here too. */
export function normaliseCode(raw: string): string {
  return raw.replace(/[^0-9]/g, '').slice(0, CODE_MAX);
}

/**
 * Worth sending. Not "definitely right" — the real length is only known to the
 * server, so this is the point at which trying costs nothing.
 */
export function longEnough(code: string): boolean {
  return code.length >= CODE_MIN;
}

/**
 * How long to refuse a resend for after one goes out.
 *
 * Supabase will not send two codes to the same address in quick succession,
 * and asking it to is worse than useless: on a good day it returns an error
 * nobody reads, and on a bad one it accepts the request and sends nothing.
 * Better not to offer the button than to let someone press it into silence.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

export type SendProblem = { kind: 'too-soon'; seconds: number } | { kind: 'other' };

/**
 * Why a code could not be sent.
 *
 * Supabase says "For security purposes, you can only request this after 51
 * seconds" — which is the one useful number in the whole message, so it is
 * pulled out and the rest thrown away.
 */
export function readSendError(message: string): SendProblem {
  const after = /after (\d+)\s*s/i.exec(message);
  if (after) return { kind: 'too-soon', seconds: Number(after[1]) };
  if (/rate limit|too many requests|429/i.test(message)) {
    return { kind: 'too-soon', seconds: RESEND_COOLDOWN_SECONDS };
  }
  return { kind: 'other' };
}

export type CodeProblem = 'expired' | 'wrong' | 'other';

/**
 * Supabase's wording for a bad code is not something to put in front of
 * someone. Two cases are worth saying properly: a code that never matched,
 * and one that has been used or has timed out — only the second needs a
 * resend, so they should not be told the same thing.
 */
export function readCodeError(message: string): CodeProblem {
  const lower = message.toLowerCase();
  if (lower.includes('expired') || lower.includes('already been used')) return 'expired';
  if (lower.includes('invalid') || lower.includes('token')) return 'wrong';
  return 'other';
}
