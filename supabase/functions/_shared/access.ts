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

/**
 * Days on the self-managed clock, for the accounts that still carry a stamp.
 * Mirrors TRIAL_DAYS. Nothing stamps it any more.
 */
export const TRIAL_DAYS = 3;

/** Accounts made before this keep the app for nothing. Mirrors GRANDFATHERED_BEFORE. */
export const GRANDFATHERED_BEFORE = '2026-10-12T00:00:00.000Z';

const DAY = 86_400_000;

export type LockInput = {
  /** profiles.created_at, ISO. */
  createdAt: string;
  /** profiles.trial_started_at, ISO. Null falls back to createdAt. */
  trialStartedAt: string | null;
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
export function isLocked({ createdAt, trialStartedAt, subscribedUntil, now }: LockInput): boolean {
  if (subscribedUntil !== null) {
    const until = Date.parse(subscribedUntil);
    if (!Number.isNaN(until) && until > now.getTime()) return false;
  }

  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false; // our bug, not theirs
  if (created < Date.parse(GRANDFATHERED_BEFORE)) return false;

  // Null means no free days of ours were ever granted, which is now the normal
  // case: a new person's three days come from Apple's introductory offer, not
  // from us. They are locked until they subscribe, and a locked member stops
  // counting as due — which is the point. A non-subscriber who cannot open the
  // app must not sit in a crew burning its grace and then resetting a streak
  // four other people are keeping alive.
  //
  // This is the one place the file's usual "every uncertain answer is false"
  // instinct is wrong. Null is not uncertain here; it is a definite no.
  if (trialStartedAt === null) return true;
  const started = Date.parse(trialStartedAt);
  if (Number.isNaN(started)) return false;

  const used = Math.max(0, Math.floor((now.getTime() - started) / DAY));
  return TRIAL_DAYS - used <= 0;
}
