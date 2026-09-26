/**
 * Which habits the Progress screen should put in front of you, and what it
 * should suggest doing about them.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  adviceRange,
  adviseOne,
  adviseWeek,
  scheduledDays,
  splitVerdicts,
  weakestWeekday,
  type Placement,
} from './advice.ts';
import { statsFor, type HabitInput, type HabitStats } from './stats.ts';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

/** 2026-09-01 is a Tuesday; 2026-09-30 a Wednesday. */
function habit(overrides: Partial<HabitInput> = {}): HabitInput {
  return {
    habitId: 'walk',
    name: '15 min walk',
    color: '#3F5FA8',
    daysOfWeek: EVERY_DAY,
    createdOn: '2026-08-01',
    archivedOn: null,
    checkedOn: [],
    ...overrides,
  };
}

function stats(overrides: Partial<HabitInput> = {}): HabitStats {
  return statsFor(habit(overrides), '2026-09-01', '2026-09-30', '2026-09-30');
}

/** Every date in September a habit on `days` is due, oldest first. */
function dueDates(days: number[] = EVERY_DAY): string[] {
  return stats({ daysOfWeek: days }).days.map((day) => day.date);
}

const ANY: Placement = { mode: 'any', anchorLabel: null, anchorLoad: 0 };
const STACKED: Placement = { mode: 'after', anchorLabel: 'Wake up', anchorLoad: 2 };
const CROWDED: Placement = { mode: 'after', anchorLabel: 'Wake up', anchorLoad: 5 };
const TIMED: Placement = { mode: 'at', anchorLabel: null, anchorLoad: 0 };

describe('the window advice reads', () => {
  it('always looks back the same stretch, whatever period is on screen', () => {
    assert.deepEqual(adviceRange('2026-09-30'), { from: '2026-09-01', to: '2026-09-30' });
  });

  it('follows the period back in time rather than pinning to today', () => {
    assert.deepEqual(adviceRange('2026-08-31'), { from: '2026-08-02', to: '2026-08-31' });
  });
});

describe('the weekday that drags a habit down', () => {
  it('names the day when the rest of the week is much better', () => {
    // Every day done except Sundays.
    const checkedOn = dueDates().filter((date) => new Date(`${date}T00:00:00Z`).getUTCDay() !== 0);
    assert.equal(weakestWeekday(stats({ checkedOn })), 0);
  });

  it('stays quiet when the whole week is equally bad', () => {
    const every = dueDates();
    const checkedOn = every.filter((_, i) => i % 3 === 0);
    assert.equal(weakestWeekday(stats({ checkedOn })), null);
  });

  it('stays quiet when nothing was missed at all', () => {
    assert.equal(weakestWeekday(stats({ checkedOn: dueDates() })), null);
  });

  it('ignores a weekday with too little history to mean anything', () => {
    // Due only on Sundays, so no other weekday clears the minimum.
    const sundays = dueDates([0]);
    assert.equal(weakestWeekday(stats({ daysOfWeek: [0], checkedOn: sundays.slice(0, 1) })), null);
  });
});

describe('one suggestion per habit', () => {
  it('suggests stacking a floating habit that keeps slipping', () => {
    const every = dueDates();
    const checkedOn = every.filter((_, i) => i % 2 === 0);
    assert.deepEqual(adviseOne(stats({ checkedOn }), ANY), { kind: 'stack' });
  });

  it('suggests lightening an anchor that is carrying too much', () => {
    const every = dueDates();
    const checkedOn = every.filter((_, i) => i % 2 === 0);
    assert.deepEqual(adviseOne(stats({ checkedOn }), CROWDED), {
      kind: 'lighten',
      anchorLabel: 'Wake up',
      load: 5,
    });
  });

  it('asks a well-placed habit for fewer days rather than inventing a fix', () => {
    // Half the days kept, nowhere in particular to point: the schedule is the
    // thing that is wrong, so offer back the number they are actually keeping.
    const every = dueDates();
    const checkedOn = every.filter((_, i) => i % 2 === 0);
    assert.deepEqual(adviseOne(stats({ checkedOn }), STACKED), { kind: 'ease-off', from: 7, to: 4 });
    assert.deepEqual(adviseOne(stats({ checkedOn }), TIMED), { kind: 'ease-off', from: 7, to: 4 });
  });

  it('prefers dropping the bad weekday over moving the habit', () => {
    const checkedOn = dueDates().filter((date) => new Date(`${date}T00:00:00Z`).getUTCDay() !== 0);
    assert.deepEqual(adviseOne(stats({ checkedOn }), CROWDED), { kind: 'drop-day', weekday: 0 });
  });

  it('reports a run instead of a fix when one is going', () => {
    const advice = adviseOne(stats({ checkedOn: dueDates() }), ANY);
    assert.equal(advice?.kind, 'run');
    assert.equal(advice?.kind === 'run' && advice.days, 30);
  });

  it('never praises a run on a habit that is still slipping', () => {
    // Bad for three weeks, then a clean run to the end of the month.
    const every = dueDates();
    const checkedOn = every.filter((date, i) => i >= every.length - 8 || i % 4 === 0);
    const slipping = stats({ checkedOn });
    assert.ok((slipping.rate ?? 1) < 0.8, 'fixture should still be below the bar');
    assert.notEqual(adviseOne(slipping, STACKED)?.kind, 'run');
  });

  it('says nothing about a habit with barely any history', () => {
    const young = statsFor(
      habit({ createdOn: '2026-09-29', checkedOn: ['2026-09-29'] }),
      '2026-09-01',
      '2026-09-30',
      '2026-09-30',
    );
    assert.equal(adviseOne(young, ANY), null);
  });
});

describe('the two lists', () => {
  const good = stats({ habitId: 'bed', name: 'Make the bed', checkedOn: dueDates() });
  const half = stats({
    habitId: 'foam',
    name: 'Foam roll',
    checkedOn: dueDates().filter((_, i) => i % 2 === 0),
  });
  const worse = stats({
    habitId: 'laundry',
    name: 'Laundry',
    daysOfWeek: WEEKDAYS,
    checkedOn: dueDates(WEEKDAYS).filter((_, i) => i % 4 === 0),
  });
  const placements = new Map<string, Placement>([
    ['bed', STACKED],
    ['foam', ANY],
    ['laundry', ANY],
  ]);

  it('puts the worst habit at the top of needs work', () => {
    const { needsWork } = splitVerdicts([good, half, worse], placements);
    assert.deepEqual(
      needsWork.map((v) => v.habitId),
      ['laundry', 'foam'],
    );
  });

  it('keeps going well separate, best first', () => {
    const { goingWell } = splitVerdicts([good, half, worse], placements);
    assert.deepEqual(
      goingWell.map((v) => v.habitId),
      ['bed'],
    );
  });

  it('leaves a habit with too little history out of both lists', () => {
    const young = statsFor(
      habit({ habitId: 'new', createdOn: '2026-09-29', checkedOn: [] }),
      '2026-09-01',
      '2026-09-30',
      '2026-09-30',
    );
    const { needsWork, goingWell } = splitVerdicts([young], placements);
    assert.equal(needsWork.length, 0);
    assert.equal(goingWell.length, 0);
  });

  it('carries the suggestion through onto the verdict', () => {
    const { needsWork } = splitVerdicts([half], placements);
    assert.deepEqual(needsWork[0]?.advice, { kind: 'stack' });
  });
});

describe('asking for fewer days', () => {
  it('offers back the number they are actually keeping', () => {
    const checkedOn = dueDates().filter((_, i) => i % 2 === 0);
    assert.deepEqual(adviseOne(stats({ checkedOn }), STACKED), { kind: 'ease-off', from: 7, to: 4 });
  });

  it('does not suggest a schedule they are already on', () => {
    // Three days a week, keeping nearly all of them: there is nothing to give
    // up, so easing off would be noise.
    const days = [1, 3, 5];
    const every = dueDates(days);
    const checkedOn = every.slice(0, every.length - 1);
    const a = adviseOne(stats({ daysOfWeek: days, checkedOn }), STACKED);
    assert.notEqual(a?.kind, 'ease-off');
  });

  it('never suggests fewer than two days, which would be a different conversation', () => {
    const days = [1, 2, 3, 4, 5];
    const every = dueDates(days);
    // One kept out of every five: a fifth of five rounds to one.
    const checkedOn = every.filter((_, i) => i % 5 === 0);
    const a = adviseOne(stats({ daysOfWeek: days, checkedOn }), STACKED);
    assert.deepEqual(a, { kind: 'ease-off', from: 5, to: 2 });
  });

  it('counts the days a habit is actually asked for', () => {
    assert.equal(scheduledDays(stats({ daysOfWeek: [1, 3, 5] })), 3);
    assert.equal(scheduledDays(stats()), 7);
  });
});

describe('letting a habit go', () => {
  it('says so once the schedule is already light and it still is not happening', () => {
    const days = [1, 3, 5];
    const every = dueDates(days);
    const checkedOn = every.slice(0, 1);
    assert.deepEqual(adviseOne(stats({ daysOfWeek: days, checkedOn }), STACKED), { kind: 'let-go' });
  });

  it('asks for fewer days first when there are still days to give up', () => {
    const every = dueDates();
    const checkedOn = every.slice(0, 2);
    const a = adviseOne(stats({ checkedOn }), STACKED);
    assert.equal(a?.kind, 'ease-off');
  });

  it('waits for enough days before saying anything so final', () => {
    // A three-day-a-week habit in its first fortnight has too little history.
    const days = [1, 3, 5];
    const short = statsFor(
      habit({ daysOfWeek: days, createdOn: '2026-09-20', checkedOn: [] }),
      '2026-09-20',
      '2026-09-30',
      '2026-09-30',
    );
    assert.notEqual(adviseOne(short, STACKED)?.kind, 'let-go');
  });

  it('points at the placement before giving up on the habit', () => {
    const days = [1, 3, 5];
    const every = dueDates(days);
    const checkedOn = every.slice(0, 1);
    // Floating with no cue is a reason it might be failing; try that first.
    assert.deepEqual(adviseOne(stats({ daysOfWeek: days, checkedOn }), ANY), { kind: 'stack' });
  });
});

describe('advice about the week itself', () => {
  const light = (id: string, days: number[], kept: number) => {
    const every = dueDates(days);
    return statsFor(
      habit({ habitId: id, daysOfWeek: days, checkedOn: every.slice(0, kept) }),
      '2026-09-01',
      '2026-09-30',
      '2026-09-30',
    );
  };

  it('says nothing when there is nothing scheduled', () => {
    assert.equal(adviseWeek([]), null);
  });

  it('names the day carrying far more than the rest, when it costs something', () => {
    // Four habits all on Monday and nothing kept, plus one easy Friday habit.
    const mondays = [0, 1, 2, 3].map((i) => light(`m${i}`, [1], 0));
    const friday = light('f', [5], 4);
    const advice = adviseWeek([...mondays, friday]);
    assert.equal(advice?.kind, 'crowded-day');
    if (advice?.kind === 'crowded-day') assert.equal(advice.weekday, 1);
  });

  it('leaves a busy day alone when the busy day is the one going well', () => {
    const mondays = [0, 1, 2, 3].map((i) => light(`m${i}`, [1], 99));
    const friday = light('f', [5], 0);
    assert.notEqual(adviseWeek([...mondays, friday])?.kind, 'crowded-day');
  });

  it('suggests a day off when every day is spoken for and the week is sagging', () => {
    const every = dueDates();
    const half = statsFor(
      habit({ checkedOn: every.filter((_, i) => i % 2 === 0) }),
      '2026-09-01',
      '2026-09-30',
      '2026-09-30',
    );
    assert.deepEqual(adviseWeek([half]), { kind: 'rest-day' });
  });

  it('does not suggest a day off to someone keeping a full week', () => {
    const every = dueDates();
    const kept = statsFor(
      habit({ checkedOn: every }),
      '2026-09-01',
      '2026-09-30',
      '2026-09-30',
    );
    assert.equal(adviseWeek([kept]), null);
  });
});
