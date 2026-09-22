/**
 * How often a habit gets done — and, more to the point, how often it was due.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bestRun,
  currentRun,
  datesBetween,
  isDue,
  overallOf,
  statsFor,
  weekdayOf,
  windowStart,
  type HabitInput,
} from './stats.ts';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

/** 2026-09-21 is a Monday, 2026-09-27 a Sunday. */
function habit(overrides: Partial<HabitInput> = {}): HabitInput {
  return {
    habitId: 'walk',
    name: '15 min walk',
    color: '#3F5FA8',
    daysOfWeek: EVERY_DAY,
    createdOn: '2026-09-01',
    archivedOn: null,
    checkedOn: [],
    ...overrides,
  };
}

describe('dates', () => {
  it('reads a weekday without drifting by time zone', () => {
    assert.equal(weekdayOf('2026-09-21'), 1);
    assert.equal(weekdayOf('2026-09-27'), 0);
  });

  it('walks a range inclusively', () => {
    assert.deepEqual(datesBetween('2026-09-21', '2026-09-23'), [
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
    ]);
  });

  it('caps a very long history instead of walking for ever', () => {
    assert.equal(datesBetween('1990-01-01', '2026-09-21').length, 400);
  });
});

describe('windows', () => {
  it('week is the last seven days, today included', () => {
    assert.equal(windowStart('week', '2026-09-21', '2020-01-01'), '2026-09-15');
  });

  it('month is the last thirty', () => {
    assert.equal(windowStart('month', '2026-09-21', '2020-01-01'), '2026-08-23');
  });

  it('all time starts at the earliest thing there is', () => {
    assert.equal(windowStart('all', '2026-09-21', '2026-03-04'), '2026-03-04');
  });
});

describe('what counts as due', () => {
  it('counts a day the habit is scheduled on', () => {
    assert.equal(isDue(habit(), '2026-09-21'), true);
  });

  it('does not count a weekday the habit skips', () => {
    assert.equal(isDue(habit({ daysOfWeek: WEEKDAYS }), '2026-09-27'), false);
  });

  it('does not count days before the habit existed', () => {
    assert.equal(isDue(habit({ createdOn: '2026-09-20' }), '2026-09-19'), false);
    assert.equal(isDue(habit({ createdOn: '2026-09-20' }), '2026-09-20'), true);
  });

  it('stops counting once it is archived', () => {
    const past = habit({ archivedOn: '2026-09-22' });
    assert.equal(isDue(past, '2026-09-21'), true);
    assert.equal(isDue(past, '2026-09-22'), false);
  });
});

describe('the rate', () => {
  it('is done over due, not done over days', () => {
    // Weekdays only: Mon 21 to Sun 27 holds five due days.
    const stats = statsFor(
      habit({ daysOfWeek: WEEKDAYS, checkedOn: ['2026-09-21', '2026-09-22'] }),
      '2026-09-21',
      '2026-09-27',
    );
    assert.equal(stats.due, 5);
    assert.equal(stats.done, 2);
    assert.equal(stats.rate, 2 / 5);
  });

  it('ignores a check-in on a day that was not due', () => {
    // Friday counts; Saturday is not a weekday habit's problem either way.
    const stats = statsFor(
      habit({ daysOfWeek: WEEKDAYS, checkedOn: ['2026-09-25', '2026-09-26'] }),
      '2026-09-21',
      '2026-09-27',
    );
    assert.equal(stats.done, 1);
    assert.equal(stats.due, 5);
  });

  it('is null rather than zero when nothing was ever due', () => {
    const stats = statsFor(
      habit({ createdOn: '2026-10-01' }),
      '2026-09-21',
      '2026-09-27',
    );
    assert.equal(stats.due, 0);
    assert.equal(stats.rate, null);
  });

  it('does not blame a habit for days before it existed', () => {
    const stats = statsFor(
      habit({ createdOn: '2026-09-25', checkedOn: ['2026-09-25', '2026-09-26', '2026-09-27'] }),
      '2026-09-21',
      '2026-09-27',
    );
    assert.equal(stats.due, 3);
    assert.equal(stats.rate, 1);
  });
});

describe('by weekday', () => {
  it('splits due and done across the seven days', () => {
    const stats = statsFor(
      habit({ checkedOn: ['2026-09-21', '2026-09-22'] }),
      '2026-09-21',
      '2026-09-27',
    );
    assert.equal(stats.byWeekday[1]?.due, 1);
    assert.equal(stats.byWeekday[1]?.done, 1);
    assert.equal(stats.byWeekday[0]?.due, 1);
    assert.equal(stats.byWeekday[0]?.done, 0);
  });

  it('leaves a skipped weekday with nothing due', () => {
    const stats = statsFor(
      habit({ daysOfWeek: WEEKDAYS }),
      '2026-09-21',
      '2026-09-27',
    );
    assert.equal(stats.byWeekday[6]?.due, 0);
  });
});

describe('runs', () => {
  it('counts the run ending on the last due day', () => {
    const stats = statsFor(
      habit({ checkedOn: ['2026-09-25', '2026-09-26', '2026-09-27'] }),
      '2026-09-21',
      '2026-09-27',
    );
    assert.equal(currentRun(stats), 3);
  });

  it('is zero when the last due day was missed', () => {
    const stats = statsFor(
      habit({ checkedOn: ['2026-09-25', '2026-09-26'] }),
      '2026-09-21',
      '2026-09-27',
    );
    assert.equal(currentRun(stats), 0);
  });

  it('remembers the best run even after it breaks', () => {
    const stats = statsFor(
      habit({ checkedOn: ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-26'] }),
      '2026-09-21',
      '2026-09-27',
    );
    assert.equal(bestRun(stats), 3);
    assert.equal(currentRun(stats), 0);
  });

  it('skips over days that were never due rather than breaking the run', () => {
    const stats = statsFor(
      habit({ daysOfWeek: WEEKDAYS, checkedOn: ['2026-09-25', '2026-09-28'] }),
      '2026-09-25',
      '2026-09-28',
    );
    // Friday and Monday are due and both done; the weekend is not a miss.
    assert.equal(currentRun(stats), 2);
  });
});

describe('everything together', () => {
  it('adds the habits up rather than averaging their rates', () => {
    const walk = statsFor(
      habit({ checkedOn: ['2026-09-21', '2026-09-22'] }),
      '2026-09-21',
      '2026-09-22',
    );
    const read = statsFor(
      habit({ habitId: 'read', daysOfWeek: [1], checkedOn: [] }),
      '2026-09-21',
      '2026-09-22',
    );
    const total = overallOf([walk, read]);
    assert.equal(total.due, 3);
    assert.equal(total.done, 2);
    assert.equal(total.rate, 2 / 3);
  });

  it('reports nothing rather than zero on an empty window', () => {
    assert.deepEqual(overallOf([]), { due: 0, done: 0, rate: null });
  });
});
