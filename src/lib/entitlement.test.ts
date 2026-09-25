/**
 * The paywall rules. These decide whether someone can open the app at all,
 * so every branch is worth a test — including the ones that only fire on a
 * device with a wrong clock.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  countsAsDue,
  decideAccess,
  GRANDFATHERED_BEFORE,
  hasAccess,
  TRIAL_DAYS,
} from './entitlement.ts';

/** An account made after the cutoff, so the trial rules actually apply. */
const AFTER = '2026-10-15T09:00:00.000Z';
const at = (iso: string) => new Date(iso);

describe('paying', () => {
  it('beats everything else, so a new subscriber is never called a trialist', () => {
    assert.deepEqual(
      decideAccess({ accountCreatedAt: AFTER, subscribed: true, now: at('2026-11-30T09:00:00.000Z') }),
      { state: 'subscribed' },
    );
  });

  it('rescues someone whose trial has already run out', () => {
    const a = decideAccess({ accountCreatedAt: AFTER, subscribed: true, now: at('2026-12-25T09:00:00.000Z') });
    assert.equal(a.state, 'subscribed');
    assert.equal(hasAccess(a), true);
  });
});

describe('the people who were here first', () => {
  it('keeps the app for an account made before the paywall', () => {
    const a = decideAccess({
      accountCreatedAt: '2026-09-25T09:00:00.000Z',
      subscribed: false,
      now: at('2027-06-01T09:00:00.000Z'),
    });
    assert.deepEqual(a, { state: 'grandfathered' });
  });

  it('does not extend that to someone who arrived a second after the cutoff', () => {
    const justAfter = new Date(Date.parse(GRANDFATHERED_BEFORE) + 1000).toISOString();
    const a = decideAccess({ accountCreatedAt: justAfter, subscribed: false, now: at(justAfter) });
    assert.equal(a.state, 'trial');
  });

  it('treats the cutoff itself as too late, so the boundary is not ambiguous', () => {
    const a = decideAccess({
      accountCreatedAt: GRANDFATHERED_BEFORE,
      subscribed: false,
      now: at(GRANDFATHERED_BEFORE),
    });
    assert.equal(a.state, 'trial');
  });
});

describe('the trial clock', () => {
  it('gives the full run on the day someone signs up', () => {
    assert.deepEqual(decideAccess({ accountCreatedAt: AFTER, subscribed: false, now: at(AFTER) }), {
      state: 'trial',
      daysLeft: TRIAL_DAYS,
    });
  });

  it('counts down a day at a time', () => {
    const a = decideAccess({ accountCreatedAt: AFTER, subscribed: false, now: at('2026-10-21T09:00:00.000Z') });
    assert.deepEqual(a, { state: 'trial', daysLeft: 1 });
  });

  it('still has a day left with minutes to spare on the last day', () => {
    const a = decideAccess({ accountCreatedAt: AFTER, subscribed: false, now: at('2026-10-22T08:59:00.000Z') });
    assert.deepEqual(a, { state: 'trial', daysLeft: 1 });
  });

  it('locks the moment the seventh day is up, not a day later', () => {
    const a = decideAccess({ accountCreatedAt: AFTER, subscribed: false, now: at('2026-10-22T09:00:00.000Z') });
    assert.deepEqual(a, { state: 'locked' });
  });

  it('starts from an explicit trial start when one is given', () => {
    const a = decideAccess({
      accountCreatedAt: AFTER,
      trialStartedAt: '2026-10-20T09:00:00.000Z',
      subscribed: false,
      now: at('2026-10-22T09:00:00.000Z'),
    });
    assert.deepEqual(a, { state: 'trial', daysLeft: 5 });
  });
});

describe('clocks and data that cannot be trusted', () => {
  it('lets someone in rather than out when the created date is unreadable', () => {
    const a = decideAccess({ accountCreatedAt: 'not a date', subscribed: false });
    assert.deepEqual(a, { state: 'trial', daysLeft: TRIAL_DAYS });
  });

  it('falls back to the account date when the trial start is rubbish', () => {
    const a = decideAccess({
      accountCreatedAt: AFTER,
      trialStartedAt: 'nonsense',
      subscribed: false,
      now: at(AFTER),
    });
    assert.deepEqual(a, { state: 'trial', daysLeft: TRIAL_DAYS });
  });

  it('does not punish a device whose clock is set in the past', () => {
    const a = decideAccess({ accountCreatedAt: AFTER, subscribed: false, now: at('2026-10-01T09:00:00.000Z') });
    assert.deepEqual(a, { state: 'trial', daysLeft: TRIAL_DAYS });
  });
});

describe('what a lapsed member does to their crew', () => {
  it('stops owing the crew a check-in once locked out', () => {
    const locked = decideAccess({ accountCreatedAt: AFTER, subscribed: false, now: at('2026-11-30T09:00:00.000Z') });
    assert.equal(locked.state, 'locked');
    assert.equal(countsAsDue(locked), false);
  });

  it('still owes it on every state that can open the app', () => {
    for (const a of [
      { state: 'subscribed' } as const,
      { state: 'grandfathered' } as const,
      { state: 'trial', daysLeft: 3 } as const,
    ]) {
      assert.equal(countsAsDue(a), true, a.state);
    }
  });
});
