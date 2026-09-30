/**
 * The order the day is shown in. The rule that matters: the front of the hand
 * is always the next thing to do, so checking one in deals it away.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { openFocus, orderForDay, type Ordered } from './today.ts';

const ANYTIME = Number.MAX_SAFE_INTEGER;

function habit(overrides: Partial<Ordered> & { id: string }): Ordered {
  return { name: overrides.id, sortKey: 0, checkedIn: false, ...overrides };
}

const day: Ordered[] = [
  habit({ id: 'floss', sortKey: 1380 }),
  habit({ id: 'walk', sortKey: 750 }),
  habit({ id: 'laundry', sortKey: ANYTIME }),
  habit({ id: 'bed', sortKey: 480 }),
  habit({ id: 'call', sortKey: ANYTIME }),
];

const names = (list: readonly Ordered[]) => list.map((h) => h.id);

describe('the order of the day', () => {
  it('runs earliest to latest', () => {
    assert.deepEqual(names(orderForDay(day)).slice(0, 3), ['bed', 'walk', 'floss']);
  });

  it('puts habits with no set time at the end', () => {
    assert.deepEqual(names(orderForDay(day)).slice(-2), ['call', 'laundry']);
  });

  it('puts the done ones behind everything still to do', () => {
    const half = day.map((h) => (h.id === 'bed' || h.id === 'laundry' ? { ...h, checkedIn: true } : h));
    assert.deepEqual(names(orderForDay(half)), ['walk', 'floss', 'call', 'bed', 'laundry']);
  });

  it('keeps the done ones in time order among themselves', () => {
    const allDone = day.map((h) => ({ ...h, checkedIn: true }));
    assert.deepEqual(names(orderForDay(allDone)), ['bed', 'walk', 'floss', 'call', 'laundry']);
  });

  it('puts an untimed habit behind the timed ones in its own half', () => {
    // The open half and the done half each run timed-then-untimed, rather than
    // every untimed habit collecting at the very end of the hand.
    const mixed = [
      habit({ id: 'open-untimed', sortKey: ANYTIME }),
      habit({ id: 'done-timed', sortKey: 600, checkedIn: true }),
      habit({ id: 'open-timed', sortKey: 900 }),
      habit({ id: 'done-untimed', sortKey: ANYTIME, checkedIn: true }),
    ];
    assert.deepEqual(names(orderForDay(mixed)), [
      'open-timed',
      'open-untimed',
      'done-timed',
      'done-untimed',
    ]);
  });

  it('breaks a tie on name, so a shared moment keeps a fixed order', () => {
    const stacked = [
      habit({ id: 'c', name: 'Vitamins', sortKey: 480 }),
      habit({ id: 'a', name: 'Make the bed', sortKey: 480 }),
      habit({ id: 'b', name: 'Stretch', sortKey: 480 }),
    ];
    assert.deepEqual(
      orderForDay(stacked).map((h) => h.name),
      ['Make the bed', 'Stretch', 'Vitamins'],
    );
  });

  it('sends a habit to the back when it is checked in', () => {
    const after = orderForDay(day.map((h) => (h.id === 'walk' ? { ...h, checkedIn: true } : h)));
    assert.equal(names(after).at(-1), 'walk');
  });

  it('brings a habit back to its time when it is checked back out', () => {
    // Undoing has to be the exact reverse, or a mistap would leave the habit
    // stranded at the back of a hand it no longer belongs to.
    const allDone = day.map((h) => ({ ...h, checkedIn: true }));
    const after = orderForDay(
      allDone.map((h) => (h.id === 'floss' ? { ...h, checkedIn: false } : h)),
    );
    assert.equal(names(after)[0], 'floss');
  });

  it('leaves the original list alone', () => {
    const copy = [...day];
    orderForDay(day);
    assert.deepEqual(names(day), names(copy));
  });

  it('handles an empty day and a single habit', () => {
    assert.deepEqual(orderForDay([]), []);
    assert.deepEqual(names(orderForDay([habit({ id: 'only' })])), ['only']);
  });
});

describe('where the day opens', () => {
  it('opens on the first habit still to do', () => {
    const ordered = orderForDay(
      day.map((h) => (h.sortKey <= 750 ? { ...h, checkedIn: true } : h)),
    );
    assert.equal(ordered[openFocus(ordered)]?.id, 'floss');
  });

  it('opens at the top when nothing is done yet', () => {
    const ordered = orderForDay(day);
    assert.equal(openFocus(ordered), 0);
    assert.equal(ordered[0]?.id, 'bed');
  });

  it('opens at the top when the day is finished', () => {
    const ordered = orderForDay(day.map((h) => ({ ...h, checkedIn: true })));
    assert.equal(openFocus(ordered), 0);
  });

  it('can open on a habit with no set time, once the timed ones are done', () => {
    const ordered = orderForDay(
      day.map((h) => (h.sortKey === ANYTIME ? h : { ...h, checkedIn: true })),
    );
    assert.equal(ordered[openFocus(ordered)]?.id, 'call');
  });

  it('returns a usable index for an empty day', () => {
    assert.equal(openFocus([]), 0);
  });
});
