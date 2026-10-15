/**
 * The week strip has to agree with the streak sitting next to it.
 *
 * The cases that matter are the two the old code got wrong: somebody leaving,
 * which used to turn their missed days into complete ones, and somebody
 * joining, which used to empty every day before they arrived.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dayComplete, wasInCrewOn, type WeekMember } from './crewWeek.ts';

const member = (over: Partial<WeekMember> = {}): WeekMember => ({
  userId: 'a',
  joinedAt: '2026-10-01T09:00:00.000Z',
  leftOn: null,
  ...over,
});

describe('who was in the crew on a day', () => {
  it('counts somebody who joined before it', () => {
    assert.equal(wasInCrewOn(member({ joinedAt: '2026-10-01T09:00:00Z' }), '2026-10-05'), true);
  });

  it('counts the day they joined', () => {
    assert.equal(wasInCrewOn(member({ joinedAt: '2026-10-05T23:00:00Z' }), '2026-10-05'), true);
  });

  it('does not count a day before they joined', () => {
    assert.equal(wasInCrewOn(member({ joinedAt: '2026-10-06T09:00:00Z' }), '2026-10-05'), false);
  });

  it('counts the days before they left', () => {
    assert.equal(wasInCrewOn(member({ leftOn: '2026-10-06' }), '2026-10-05'), true);
  });

  it('does not count the day they left, or after', () => {
    // left_on is the first day they are out, which is why removal is set to
    // tomorrow: today still counts for them.
    assert.equal(wasInCrewOn(member({ leftOn: '2026-10-06' }), '2026-10-06'), false);
    assert.equal(wasInCrewOn(member({ leftOn: '2026-10-06' }), '2026-10-07'), false);
  });
});

describe('whether a day is complete', () => {
  it('is complete when everybody in the crew checked in', () => {
    const ms = [member({ userId: 'a' }), member({ userId: 'b' })];
    assert.equal(dayComplete(ms, '2026-10-05', new Set(['a', 'b'])), true);
  });

  it('is not complete when one of them did not', () => {
    const ms = [member({ userId: 'a' }), member({ userId: 'b' })];
    assert.equal(dayComplete(ms, '2026-10-05', new Set(['a'])), false);
  });

  it('does not let removing somebody rewrite a day they missed', () => {
    // The reported bug. b was in the crew on the 5th and did not check in, so
    // the 5th was a miss and must stay one after b is removed on the 7th.
    const ms = [member({ userId: 'a' }), member({ userId: 'b', leftOn: '2026-10-07' })];
    assert.equal(dayComplete(ms, '2026-10-05', new Set(['a'])), false);
  });

  it('stops counting somebody from the day they left', () => {
    const ms = [member({ userId: 'a' }), member({ userId: 'b', leftOn: '2026-10-07' })];
    assert.equal(dayComplete(ms, '2026-10-07', new Set(['a'])), true);
  });

  it('does not empty the week when somebody new joins', () => {
    // The other half, and the one that would have been seen more often: c
    // joined on the 6th, so the 5th is judged on who was actually there.
    const ms = [member({ userId: 'a' }), member({ userId: 'c', joinedAt: '2026-10-06T09:00:00Z' })];
    assert.equal(dayComplete(ms, '2026-10-05', new Set(['a'])), true);
  });

  it('counts the newcomer from the day they arrived', () => {
    const ms = [member({ userId: 'a' }), member({ userId: 'c', joinedAt: '2026-10-06T09:00:00Z' })];
    assert.equal(dayComplete(ms, '2026-10-06', new Set(['a'])), false);
    assert.equal(dayComplete(ms, '2026-10-06', new Set(['a', 'c'])), true);
  });

  it('is not complete on a day nobody was in the crew', () => {
    const ms = [member({ userId: 'a', joinedAt: '2026-10-10T09:00:00Z' })];
    assert.equal(dayComplete(ms, '2026-10-05', new Set()), false);
  });

  it('handles a crew with nobody in it at all', () => {
    assert.equal(dayComplete([], '2026-10-05', new Set()), false);
  });
});
