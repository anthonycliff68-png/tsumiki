/**
 * Who can use the app, and who sees a paywall.
 *
 * This is deliberately a pure function with no SDK in it. Whether someone has
 * paid comes from RevenueCat, but *what that means* is a rule, and rules are
 * the thing that breaks quietly six months later. It is decided here, once,
 * where it can be tested.
 *
 * Two decisions are baked in and worth stating plainly.
 *
 * Anyone who had the app before the paywall keeps it, permanently. They
 * installed something free and it would be a bait and switch to take it back.
 * That is only possible because profiles.created_at has been recorded since
 * the first migration — it cannot be reconstructed later, so the cutoff is a
 * constant rather than a guess.
 *
 * And when a trial runs out, that member stops counting as *due* rather than
 * breaking the streak. A crew is two to five people sharing one streak; one
 * person lapsing must not punish the four who are still turning up.
 */

/** Days of full access before the paywall appears. */
export const TRIAL_DAYS = 7;

/**
 * Accounts created before this keep the app for nothing, for good.
 *
 * It is set deliberately late — comfortably past when 1.1 is expected to
 * clear review — because the two ways of being wrong are not equal. Set it
 * too early and someone who installed a free app is told, without warning,
 * that it now costs money; that is the version people write reviews about.
 * Set it too late and a handful of early users keep the app for nothing,
 * which is a rounding error and arguably money well spent on the people who
 * showed up first.
 *
 * Move it forward if 1.1 slips. Never move it backwards: someone already on
 * the free side of this line was promised something.
 */
export const GRANDFATHERED_BEFORE = '2026-11-01T00:00:00.000Z';

export type Access =
  | { state: 'subscribed' }
  | { state: 'grandfathered' }
  | { state: 'trial'; daysLeft: number }
  | { state: 'locked' };

export type AccessInput = {
  /** profiles.created_at, ISO. */
  accountCreatedAt: string;
  /** When the trial clock started. Defaults to the account being made. */
  trialStartedAt?: string | null;
  /** RevenueCat's answer: is an entitlement active right now? */
  subscribed: boolean;
  now?: Date;
};

const DAY = 86_400_000;

/**
 * Order matters. Paying beats everything, because someone who has just paid
 * should never be told they are on a trial. Grandfathering beats the clock,
 * because their clock never started. Only then does the trial get counted.
 */
export function decideAccess({
  accountCreatedAt,
  trialStartedAt,
  subscribed,
  now = new Date(),
}: AccessInput): Access {
  if (subscribed) return { state: 'subscribed' };

  const created = Date.parse(accountCreatedAt);
  // An unreadable date is our bug, not theirs: let them in and fix it.
  if (Number.isNaN(created)) return { state: 'trial', daysLeft: TRIAL_DAYS };

  if (created < Date.parse(GRANDFATHERED_BEFORE)) return { state: 'grandfathered' };

  const startedRaw = trialStartedAt === null || trialStartedAt === undefined
    ? created
    : Date.parse(trialStartedAt);
  const started = Number.isNaN(startedRaw) ? created : startedRaw;

  const elapsed = Math.floor((now.getTime() - started) / DAY);
  // A clock that has run backwards (a device with the wrong date, a row
  // written in the future) should not cost anyone their trial.
  const used = Math.max(0, elapsed);
  const daysLeft = TRIAL_DAYS - used;

  return daysLeft > 0 ? { state: 'trial', daysLeft } : { state: 'locked' };
}

/** Can they use the app at all? */
export function hasAccess(access: Access): boolean {
  return access.state !== 'locked';
}

/**
 * Does this member still owe the crew a check-in today?
 *
 * A locked member does not, which is what stops one lapsed trial from
 * resetting a streak four other people are keeping alive.
 */
export function countsAsDue(access: Access): boolean {
  return hasAccess(access);
}
