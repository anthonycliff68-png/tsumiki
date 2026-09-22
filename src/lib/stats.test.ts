/**
 * How often a habit gets done — and, more to the point, how often it was due.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bestRun,
  calendarFor,
  currentRun,
  datesBetween,
  endOfMonth,
  isDue,
  overallOf,
  periodRange,
  startOfWeek,
  statsFor,
  weekdayOf,
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

describe('periods', () => {
  it('a day is just that day', () => {
    assert.deepEqual(periodRange('day', '2026-09-22'), {
      from: '2026-09-22',
      to: '2026-09-22',
    });
  });

  it('a week runs Sunday to Saturday around the date', () => {
    // 22 Sep 2026 is a Tuesday.
    assert.deepEqual(periodRange('week', '2026-09-22'), {
      from: '2026-09-20',
      to: '2026-09-26',
    });
  });

  it('a week starting on Sunday is its own first day', () => {
    assert.equal(startOfWeek('2026-09-20'), '2026-09-20');
  });

  it('a month is the whole calendar month', () => {
    assert.deepEqual(periodRange('month', '2026-09-22'), {
      from: '2026-09-01',
      to: '2026-09-30',
    });
  });

  it('knows how long a month is, February included', () => {
    assert.equal(endOfMonth('2026-02-05'), '2026-02-28');
    assert.equal(endOfMonth('2028-02-05'), '2028-02-29');
    assert.equal(endOfMonth('2026-12-31'), '2026-12-31');
  });

  it('steps back a period at a time', () => {
    assert.deepEqual(periodRange('day', '2026-09-22', 1), {
      from: '2026-09-21',
      to: '2026-09-21',
    });
    assert.deepEqual(periodRange('week', '2026-09-22', 1), {
      from: '2026-09-13',
      to: '2026-09-19',
    });
    assert.deepEqual(periodRange('month', '2026-09-22', 1), {
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });

  it('steps back across a year boundary', () => {
    assert.deepEqual(periodRange('month', '2026-01-15', 1), {
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });
});

describe('what counts as due', () => {
  it('counts a day the habit is scheduled on', () => {
    assert.equal(isDue(habit(), '2026-09-21'), true);
  });

  it('does not count a weekday the habit skips', () => {
    assert.equal(isDue(habit({ daysOfWeek: WEEKDAYS }), '2026-09-27'), false);
  });

  it('does not count empty days before the habit existed', () => {
    assert.equal(isDue(habit({ createdOn: '2026-09-20' }), '2026-09-19'), false);
    assert.equal(isDue(habit({ createdOn: '2026-09-20' }), '2026-09-20'), true);
  });

  it('counts a day before it existed that was filled in afterwards', () => {
    // Backfilling through the day pills is real history, not a miss.
    const backfilled = habit({ createdOn: '2026-09-22', checkedOn: ['2026-09-20'] });
    assert.equal(isDue(backfilled, '2026-09-20'), true);
    assert.equal(isDue(backfilled, '2026-09-19'), false);
  });

  it('still ignores a backfilled day the habit does not run on', () => {
    const weekdayOnly = habit({
      daysOfWeek: WEEKDAYS,
      createdOn: '2026-09-22',
      checkedOn: ['2026-09-27'],
    });
    assert.equal(isDue(weekdayOnly, '2026-09-27'), false);
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

  it('keeps history filled in for days before the habit was made', () => {
    const stats = statsFor(
      habit({ createdOn: '2026-09-22', checkedOn: ['2026-09-20', '2026-09-21', '2026-09-22'] }),
      '2026-09-16',
      '2026-09-22',
    );
    // The 20th, 21st and 22nd; the empty days before the habit existed are not misses.
    assert.equal(stats.due, 3);
    assert.equal(stats.done, 3);
    assert.equal(stats.days.length, 3);
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

describe('the calendar', () => {
  it('tells a miss apart from a day that was never on', () => {
    const cal = calendarFor(
      habit({ daysOfWeek: WEEKDAYS, checkedOn: ['2026-09-21'] }),
      '2026-09-21',
      '2026-09-27',
    );
    assert.equal(cal.find((d) => d.date === '2026-09-21')?.state, 'done');
    assert.equal(cal.find((d) => d.date === '2026-09-22')?.state, 'missed');
    // Saturday: a weekday habit never owed you this one.
    assert.equal(cal.find((d) => d.date === '2026-09-26')?.state, 'not-due');
  });

  it('covers every day in the window, not just the due ones', () => {
    const cal = calendarFor(habit({ daysOfWeek: [1] }), '2026-09-21', '2026-09-27');
    assert.equal(cal.length, 7);
  });
});

describe('days that have not happened yet', () => {
  it('does not count a future scheduled day as missed', () => {
    const stats = statsFor(habit(), '2026-09-20', '2026-09-26', '2026-09-22');
    // Sunday to Tuesday only; the rest of the week is still to come.
    assert.equal(stats.due, 3);
  });

  it('marks them apart in the calendar', () => {
    const cal = calendarFor(habit(), '2026-09-20', '2026-09-26', '2026-09-22');
    assert.equal(cal.find((d) => d.date === '2026-09-22')?.state, 'missed');
    assert.equal(cal.find((d) => d.date === '2026-09-23')?.state, 'future');
  });

  it('still shows a future day you somehow checked in as done', () => {
    const cal = calendarFor(
      habit({ checkedOn: ['2026-09-25'] }),
      '2026-09-20',
      '2026-09-26',
      '2026-09-22',
    );
    assert.equal(cal.find((d) => d.date === '2026-09-25')?.state, 'done');
  });
});
