/**
 * Who the nightly job still counts as owing a day. The case that matters is a
 * lapsed trial: it must not cost four other people their streak.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GRANDFATHERED_BEFORE, isLocked, TRIAL_DAYS } from './access.ts';

const NOW = new Date('2026-12-01T12:00:00.000Z');
const daysBefore = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();

const lock = (over: Partial<Parameters<typeof isLocked>[0]>) =>
  isLocked({ createdAt: daysBefore(30), subscribedUntil: null, now: NOW, ...over });

describe('who is locked out', () => {
  it('locks an account whose trial has run out', () => {
    assert.equal(lock({ createdAt: daysBefore(TRIAL_DAYS + 1) }), true);
  });

  it('leaves someone still inside their trial alone', () => {
    assert.equal(lock({ createdAt: daysBefore(TRIAL_DAYS - 1) }), false);
  });

  it('treats the last day of the trial as still theirs', () => {
    assert.equal(lock({ createdAt: daysBefore(TRIAL_DAYS - 1) }), false);
    assert.equal(lock({ createdAt: daysBefore(TRIAL_DAYS) }), true);
  });

  it('never locks a grandfathered account, however old', () => {
    const before = new Date(Date.parse(GRANDFATHERED_BEFORE) - 86_400_000).toISOString();
    assert.equal(lock({ createdAt: before }), false);
  });

  it('does not lock someone whose subscription is live', () => {
    assert.equal(
      lock({ createdAt: daysBefore(30), subscribedUntil: daysBefore(-30) }),
      false,
    );
  });

  it('locks someone whose subscription has lapsed, with no app open needed', () => {
    assert.equal(
      lock({ createdAt: daysBefore(30), subscribedUntil: daysBefore(1) }),
      true,
    );
  });

  it('counts an unreadable date as due rather than locking someone out', () => {
    assert.equal(lock({ createdAt: 'not a date' }), false);
    assert.equal(lock({ createdAt: daysBefore(30), subscribedUntil: 'rubbish' }), true);
  });

  it('does not lock an account dated in the future', () => {
    assert.equal(lock({ createdAt: daysBefore(-5) }), false);
  });
});
