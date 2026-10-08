/**
 * The "never miss twice" rules. Run with: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  datesToEvaluate,
  evaluateDay,
  lastCompletedDate,
  localDateIn,
  memberDueOn,
  type CrewState,
  type MemberState,
  weekdayOf,
} from './streak.ts';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

/** 2026-09-21 is a Monday; 2026-09-26 a Saturday. */
const MONDAY = '2026-09-21';
const SATURDAY = '2026-09-26';

function crew(overrides: Partial<CrewState> = {}): CrewState {
  return {
    streakCurrent: 4,
    streakBest: 9,
    members: [
      { userId: 'ana', daysOfWeek: EVERY_DAY, graceUsed: false },
      { userId: 'ben', daysOfWeek: EVERY_DAY, graceUsed: false },
    ],
    ...overrides,
  };
}

describe('weekdayOf', () => {
  it('reads a date as a weekday without drifting by time zone', () => {
    assert.equal(weekdayOf('2026-09-21'), 1); // Monday
    assert.equal(weekdayOf('2026-09-26'), 6); // Saturday
    assert.equal(weekdayOf('2026-09-27'), 0); // Sunday
  });
});

describe('a clean day', () => {
  it('adds one to the streak when everyone checks in', () => {
    const result = evaluateDay(crew(), MONDAY, new Set(['ana', 'ben']));
    assert.equal(result.outcome, 'clean');
    assert.equal(result.streakCurrent, 5);
    assert.deepEqual(result.missed, []);
  });

  it('raises the best streak once it passes it', () => {
    const result = evaluateDay(
      crew({ streakCurrent: 9, streakBest: 9 }),
      MONDAY,
      new Set(['ana', 'ben']),
    );
    assert.equal(result.streakBest, 10);
  });

  it('leaves the best streak alone while below it', () => {
    const result = evaluateDay(crew(), MONDAY, new Set(['ana', 'ben']));
    assert.equal(result.streakBest, 9);
  });
});

describe('missing once', () => {
  it('forgives the first miss and carries the streak on', () => {
    const result = evaluateDay(crew(), MONDAY, new Set(['ana']));
    assert.equal(result.outcome, 'forgiven');
    assert.equal(result.streakCurrent, 5);
    assert.deepEqual(result.missed, ['ben']);
  });

  it('spends that member\'s grace, and only theirs', () => {
    const result = evaluateDay(crew(), MONDAY, new Set(['ana']));
    assert.equal(result.members.find((m) => m.userId === 'ben')?.graceUsed, true);
    assert.equal(result.members.find((m) => m.userId === 'ana')?.graceUsed, false);
  });
});

/**
 * The case that was missing, and that shipped a wrong number because of it.
 *
 * Grace is there so one person's slip does not cost the others their streak.
 * It is not there to make days out of nothing — and with nobody tested on the
 * day nobody turned up, it did: a real crew read "1 day strong" having not
 * checked in for three days.
 */
describe('a day nobody turned up', () => {
  it('holds the streak where it is, rather than growing it', () => {
    const before = crew().streakCurrent;
    const result = evaluateDay(crew(), MONDAY, new Set());
    assert.equal(result.outcome, 'forgiven');
    assert.equal(result.streakCurrent, before);
  });

  it('does not move the best streak either', () => {
    const result = evaluateDay(crew(), MONDAY, new Set());
    assert.equal(result.streakBest, crew().streakBest);
  });

  it('still spends everybody\'s grace, so tomorrow is the one that counts', () => {
    const result = evaluateDay(crew(), MONDAY, new Set());
    assert.deepEqual(result.missed.sort(), ['ana', 'ben']);
    assert.equal(result.members.every((m) => m.graceUsed), true);
  });

  it('resets on the second such day in a row', () => {
    const first = evaluateDay(crew(), MONDAY, new Set());
    const second = evaluateDay(
      { ...crew(), members: first.members, streakCurrent: first.streakCurrent },
      MONDAY,
      new Set(),
    );
    assert.equal(second.outcome, 'reset');
    assert.equal(second.streakCurrent, 0);
  });

  it('still grows when even one of them turns up', () => {
    const before = crew().streakCurrent;
    const result = evaluateDay(crew(), MONDAY, new Set(['ana']));
    assert.equal(result.streakCurrent, before + 1);
  });
});

describe('missing twice', () => {
  it('resets the streak when a member misses with their grace already spent', () => {
    const spent = crew({
      members: [
        { userId: 'ana', daysOfWeek: EVERY_DAY, graceUsed: false },
        { userId: 'ben', daysOfWeek: EVERY_DAY, graceUsed: true },
      ],
    });
    const result = evaluateDay(spent, MONDAY, new Set(['ana']));
    assert.equal(result.outcome, 'reset');
    assert.equal(result.streakCurrent, 0);
  });

  it('keeps the best streak through a reset', () => {
    const spent = crew({
      streakBest: 19,
      members: [{ userId: 'ben', daysOfWeek: EVERY_DAY, graceUsed: true }],
    });
    const result = evaluateDay(spent, MONDAY, new Set());
    assert.equal(result.streakBest, 19);
  });

  it('gives everyone their grace back so the next streak starts clean', () => {
    const spent = crew({
      members: [
        { userId: 'ana', daysOfWeek: EVERY_DAY, graceUsed: true },
        { userId: 'ben', daysOfWeek: EVERY_DAY, graceUsed: true },
      ],
    });
    const result = evaluateDay(spent, MONDAY, new Set());
    assert.ok(result.members.every((member) => member.graceUsed === false));
  });

  it('checking in gives a member their grace back', () => {
    const spent = crew({
      members: [
        { userId: 'ana', daysOfWeek: EVERY_DAY, graceUsed: false },
        { userId: 'ben', daysOfWeek: EVERY_DAY, graceUsed: true },
      ],
    });
    const result = evaluateDay(spent, MONDAY, new Set(['ana', 'ben']));
    assert.equal(result.outcome, 'clean');
    assert.equal(result.members.find((m) => m.userId === 'ben')?.graceUsed, false);
  });

  it('a forgiven day followed by a clean day does not reset', () => {
    const afterForgiven = evaluateDay(crew(), MONDAY, new Set(['ana']));
    const next = evaluateDay(
      { ...crew(), ...afterForgiven },
      '2026-09-22',
      new Set(['ana', 'ben']),
    );
    assert.equal(next.outcome, 'clean');
    assert.equal(next.streakCurrent, 6);
  });

  it('two misses in a row by the same member resets on the second', () => {
    const first = evaluateDay(crew(), MONDAY, new Set(['ana']));
    assert.equal(first.outcome, 'forgiven');
    const second = evaluateDay({ ...crew(), ...first }, '2026-09-22', new Set(['ana']));
    assert.equal(second.outcome, 'reset');
    assert.equal(second.streakCurrent, 0);
  });
});

describe('schedule gaps', () => {
  it('passes over a day nobody has scheduled, without touching the streak', () => {
    const weekdayOnly = crew({
      members: [
        { userId: 'ana', daysOfWeek: WEEKDAYS, graceUsed: false },
        { userId: 'ben', daysOfWeek: WEEKDAYS, graceUsed: false },
      ],
    });
    const result = evaluateDay(weekdayOnly, SATURDAY, new Set());
    assert.equal(result.outcome, 'not-scheduled');
    assert.equal(result.streakCurrent, 4);
    assert.deepEqual(result.missed, []);
  });

  it('does not count a member who was not due that day as missing', () => {
    const mixed = crew({
      members: [
        { userId: 'ana', daysOfWeek: EVERY_DAY, graceUsed: false },
        { userId: 'ben', daysOfWeek: WEEKDAYS, graceUsed: false },
      ],
    });
    const result = evaluateDay(mixed, SATURDAY, new Set(['ana']));
    assert.equal(result.outcome, 'clean');
    assert.equal(result.streakCurrent, 5);
    assert.equal(result.members.find((m) => m.userId === 'ben')?.graceUsed, false);
  });

  it('still resets when the member who is due misses twice', () => {
    const mixed = crew({
      members: [
        { userId: 'ana', daysOfWeek: EVERY_DAY, graceUsed: true },
        { userId: 'ben', daysOfWeek: WEEKDAYS, graceUsed: false },
      ],
    });
    const result = evaluateDay(mixed, SATURDAY, new Set());
    assert.equal(result.outcome, 'reset');
  });
});

describe('time zones', () => {
  it('reads the local date in each zone', () => {
    // 2026-09-22 09:00 UTC: already the 22nd in Auckland, still the 21st in Los Angeles.
    const now = new Date('2026-09-22T09:00:00Z');
    assert.equal(localDateIn('Pacific/Auckland', now), '2026-09-22');
    assert.equal(localDateIn('Europe/London', now), '2026-09-22');
    assert.equal(localDateIn('America/Los_Angeles', now), '2026-09-22');
  });

  it('waits for the member whose day is furthest behind', () => {
    // 2026-09-22 09:00 UTC is still the 21st in Honolulu (UTC-10).
    const now = new Date('2026-09-22T09:00:00Z');
    assert.equal(localDateIn('Pacific/Honolulu', now), '2026-09-21');
    const through = lastCompletedDate(['Pacific/Auckland', 'Pacific/Honolulu'], now);
    assert.equal(through, '2026-09-20');
  });

  it('judges yesterday once the slowest member has rolled over', () => {
    const now = new Date('2026-09-22T23:00:00Z');
    const through = lastCompletedDate(['Pacific/Auckland', 'Pacific/Honolulu'], now);
    assert.equal(through, '2026-09-21');
  });

  it('treats an unknown time zone as UTC rather than failing', () => {
    const now = new Date('2026-09-22T09:00:00Z');
    assert.equal(localDateIn('Mars/Olympus_Mons', now), '2026-09-22');
  });
});

describe('which days to evaluate', () => {
  it('judges only the day after the last run, through to the target', () => {
    assert.deepEqual(datesToEvaluate('2026-09-19', '2026-09-21'), ['2026-09-20', '2026-09-21']);
  });

  it('is idempotent: nothing left once the target is already judged', () => {
    assert.deepEqual(datesToEvaluate('2026-09-21', '2026-09-21'), []);
  });

  it('judges nothing for a crew that has never been evaluated', () => {
    // It used to judge that one day. But a streak counts days the crew got
    // through while the app was watching, and before the first run nobody was
    // watching — counting them invents a number out of history that was never
    // judged at the time. The caller records the cursor and starts tomorrow.
    assert.deepEqual(datesToEvaluate(null, '2026-09-21'), []);
  });

  it('caps a long catch-up rather than walking back for ever', () => {
    assert.equal(datesToEvaluate('2020-01-01', '2026-09-21').length, 30);
  });
});

/**
 * Who was in the crew, and when.
 *
 * These exist because removing somebody used to delete their row, which made
 * the streak riggable: miss twice, get removed before the nightly job runs,
 * and the reset never happens. A membership change must not be able to rewrite
 * a day that has already been judged.
 */
describe('membership over time', () => {
  const MON = '2026-10-05'; // a Monday
  const base = (over: Partial<MemberState>): MemberState => ({
    userId: 'ana',
    daysOfWeek: EVERY_DAY,
    graceUsed: false,
    ...over,
  });

  it('counts a member who is still in', () => {
    assert.equal(memberDueOn(base({ joinedOn: '2026-09-01', leftOn: null }), MON), true);
  });

  it('stops counting them from the day they left, not before', () => {
    // Left on the Monday: that day is already theirs to miss.
    assert.equal(memberDueOn(base({ leftOn: MON }), MON), false);
    assert.equal(memberDueOn(base({ leftOn: '2026-10-06' }), MON), true);
  });

  it('does not count them before they joined', () => {
    assert.equal(memberDueOn(base({ joinedOn: '2026-10-06' }), MON), false);
    assert.equal(memberDueOn(base({ joinedOn: MON }), MON), true);
  });

  it('does not count somebody who has never turned up', () => {
    // Joining a crew on a long run must not let you end it on day one.
    assert.equal(memberDueOn(base({ startedOn: null }), MON), false);
  });

  it('counts them from their first check-in onwards', () => {
    assert.equal(memberDueOn(base({ startedOn: '2026-10-06' }), MON), false);
    assert.equal(memberDueOn(base({ startedOn: MON }), MON), true);
    assert.equal(memberDueOn(base({ startedOn: '2026-09-01' }), MON), true);
  });

  it('still respects the weekday, whatever the membership says', () => {
    assert.equal(memberDueOn(base({ daysOfWeek: [0], joinedOn: '2026-09-01' }), MON), false);
  });

  it('leaves a crew alone on a day its only member had already gone', () => {
    const crewAfterLeaving = {
      streakCurrent: 4,
      streakBest: 9,
      members: [base({ userId: 'ben', leftOn: '2026-10-01' })],
    };
    const result = evaluateDay(crewAfterLeaving, MON, new Set());
    // Nobody was due, so there is nothing here to miss and nothing to reset.
    assert.equal(result.outcome, 'not-scheduled');
    assert.equal(result.streakCurrent, 4);
  });
});
