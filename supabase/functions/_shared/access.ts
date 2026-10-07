/**
 * Who still owes their crew a check-in.
 *
 * This mirrors `decideAccess` in src/lib/entitlement.ts, which is the client's
 * copy and the one that decides what a person sees. The two are deliberately
 * separate files: that one runs in the app, this one in Deno inside the
 * nightly job, and the job cannot import across the project root.
 *
 * Keep the two constants below in step with that file. They are the only
 * things that can drift, and a drift means a crew is judged by one rule and
 * shown another.
 */

/** Days of full access before the paywall appears. Mirrors TRIAL_DAYS. */
export const TRIAL_DAYS = 3;

/** Accounts made before this keep the app for nothing. Mirrors GRANDFATHERED_BEFORE. */
export const GRANDFATHERED_BEFORE = '2026-10-06T00:00:00.000Z';

const DAY = 86_400_000;

export type LockInput = {
  /** profiles.created_at, ISO. */
  createdAt: string;
  /** profiles.subscribed_until, ISO. Null when they have never subscribed. */
  subscribedUntil: string | null;
  now: Date;
};

/**
 * Is this member locked out right now?
 *
 * Every uncertain answer is false — still counted as due — because that is the
 * direction that cannot silently keep a streak alive that should have broken.
 * A crew whose streak holds for the wrong reason is worse than one that does
 * not: the streak is the only thing the app asks anyone to believe.
 */
export function isLocked({ createdAt, subscribedUntil, now }: LockInput): boolean {
  if (subscribedUntil !== null) {
    const until = Date.parse(subscribedUntil);
    if (!Number.isNaN(until) && until > now.getTime()) return false;
  }

  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false; // our bug, not theirs
  if (created < Date.parse(GRANDFATHERED_BEFORE)) return false;

  const used = Math.max(0, Math.floor((now.getTime() - created) / DAY));
  return TRIAL_DAYS - used <= 0;
}
