/**
 * The order the day is shown in. The rule that matters: checking a habit in
 * must never move it.
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

  it('does not move a habit when it is checked in', () => {
    const before = names(orderForDay(day));
    const after = names(
      orderForDay(day.map((h) => (h.id === 'walk' ? { ...h, checkedIn: true } : h))),
    );
    assert.deepEqual(after, before);
  });

  it('does not move a habit when it is checked back out', () => {
    const allDone = day.map((h) => ({ ...h, checkedIn: true }));
    const before = names(orderForDay(allDone));
    const after = names(
      orderForDay(allDone.map((h) => (h.id === 'floss' ? { ...h, checkedIn: false } : h))),
    );
    assert.deepEqual(after, before);
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
