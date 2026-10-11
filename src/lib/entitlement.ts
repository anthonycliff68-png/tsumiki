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

/**
 * Days of full access on the self-managed clock.
 *
 * Only ever applied to accounts that already carry a `trial_started_at` stamp
 * from before the paywall became the gate. Nothing stamps it any more: the
 * three free days a new person gets are Apple's introductory offer, bought
 * with a card, so the end of them is a renewal rather than a lockout.
 */
export const TRIAL_DAYS = 3;

/**
 * Accounts created before this keep the app for nothing, for good.
 *
 * It is set deliberately late — comfortably past when 1.1 is expected to
 * clear review — because the two ways of being wrong are not equal. Set it
 * too early and someone who installed a free app is told, without warning,
 * that it now costs money; that is the version people write reviews about.
 * Set it too late and a handful of early users keep the app for nothing,
 * which is the smaller mistake by a long way. They turned up before there was
 * any reason to, and keeping faith with them is the point.
 *
 * Move it forward if 1.1 slips. Never move it backwards: someone already on
 * the free side of this line was promised something.
 *
 * Set to 6 October 2026, the day 1.0 was held back rather than released. With
 * nothing on the App Store, the only accounts that exist are the TestFlight
 * testers', and those are the people this is for.
 *
 * Moved when the self-managed trial clock was removed. Until then, opening the
 * app granted three free days to anybody who had none; after it, a missing
 * stamp means locked, and twelve accounts sat between those two rules — people
 * with a routine already set up who would have opened the next build and found
 * a paywall where three free days used to be.
 *
 * It is set to the minute 1.1.0 became downloadable: 9 October 2026, 10:48
 * EDT. That is the first moment anybody could get the app without being
 * invited, and it is the line the sentence above is really drawing. Everyone
 * before it installed through TestFlight, with no paywall in the build at all.
 * Everyone after it found a paid app on the App Store and downloaded it
 * knowing the price — 1.1.0 shipped with the paywall in it. Grandfathering
 * them too would not be keeping faith with early users, it would be giving the
 * app away to people who had already agreed to pay for it.
 *
 * The minute matters rather than the day: an account made at 13:00 UTC that
 * day is a tester, and one made at 15:34 UTC is not.
 *
 * It was 1 November, then 20 October, and both were wrong for a reason worth
 * writing down: while this date is in the future, no account can ever reach
 * 'locked', so the paywall cannot be shown to anybody — including App Review,
 * who cannot approve a subscription they are unable to open. /plans exists so
 * that is no longer load-bearing, but the trap is easy to walk back into.
 *
 * The mirror of this constant lives in supabase/functions/_shared/access.ts
 * and must move at the same time.
 */
export const GRANDFATHERED_BEFORE = '2026-10-09T14:48:00.000Z';

/**
 * An entitlement that is active and never runs out.
 *
 * RevenueCat gives a lifetime entitlement no `expirationDate`, which is the
 * same `null` it gives somebody with no entitlement at all.
 */
const NEVER_EXPIRES = '9999-12-31T00:00:00.000Z';

/**
 * What to mirror onto `profiles.subscribed_until` for an entitlement.
 *
 * The nightly streak job runs in Postgres and cannot ask RevenueCat anything,
 * so the expiry is copied onto the profile for it to read. A lifetime grant
 * arrives with no expiry, and writing that null through would tell the job the
 * person is locked out — which stops them counting as due, which leaves their
 * crew's streak alive on days nobody turned up. A streak that holds for the
 * wrong reason is the one outcome the rules here exist to prevent.
 *
 * It lives in this file rather than next to the SDK call because this one has
 * no imports, and anything that reaches into react-native-purchases cannot be
 * loaded by a test.
 */
export function expiryToMirror(
  active: { expirationDate?: string | null } | undefined,
): string | null {
  if (active === undefined) return null;
  return active.expirationDate ?? NEVER_EXPIRES;
}

export type Access =
  | { state: 'subscribed' }
  | { state: 'grandfathered' }
  | { state: 'trial'; daysLeft: number }
  | { state: 'locked' };

export type AccessInput = {
  /** profiles.created_at, ISO. */
  accountCreatedAt: string;
  /**
   * When the self-managed trial clock started, or null if one was never
   * granted — which is the normal case now. Null means locked: the free days
   * come from Apple's introductory offer, not from us.
   */
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

  // No stamp means no free days of ours were ever granted, and that is now
  // the normal case. New accounts get their three days from Apple instead, as
  // an introductory offer on the subscription itself — which means a card is
  // on file before the days start, and nobody is hard-locked out of their own
  // habits three days later with no way back in.
  //
  // The stamp survives for the people who already had one when this changed.
  // Cutting those trials short to tidy up the rule would have been taking
  // something back that they had already been given.
  if (trialStartedAt === null || trialStartedAt === undefined) return { state: 'locked' };

  // A stamp that will not parse belongs to somebody who *was* granted the
  // days, so they keep them: our bad row should not cost them the trial.
  const startedRaw = Date.parse(trialStartedAt);
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
