/**
 * The full date under the weekday on Today. Ordinals are the only part with a
 * rule worth testing: 11th, 12th and 13th do not follow the 1st/2nd/3rd one.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatFullDate, formatWeekday } from './dates.ts';

/** Local noon, so no timezone can tip the date either way. */
const on = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('the full date', () => {
  it('names the month, the day and the year', () => {
    assert.equal(formatFullDate(on(2026, 10, 5)), 'October 5th, 2026');
  });

  it('uses st, nd and rd where they belong', () => {
    assert.equal(formatFullDate(on(2026, 10, 1)), 'October 1st, 2026');
    assert.equal(formatFullDate(on(2026, 10, 2)), 'October 2nd, 2026');
    assert.equal(formatFullDate(on(2026, 10, 3)), 'October 3rd, 2026');
    assert.equal(formatFullDate(on(2026, 10, 21)), 'October 21st, 2026');
    assert.equal(formatFullDate(on(2026, 10, 22)), 'October 22nd, 2026');
    assert.equal(formatFullDate(on(2026, 10, 23)), 'October 23rd, 2026');
  });

  it('keeps the teens on th, which is the whole point', () => {
    assert.equal(formatFullDate(on(2026, 10, 11)), 'October 11th, 2026');
    assert.equal(formatFullDate(on(2026, 10, 12)), 'October 12th, 2026');
    assert.equal(formatFullDate(on(2026, 10, 13)), 'October 13th, 2026');
  });

  it('handles the last day of a month', () => {
    assert.equal(formatFullDate(on(2026, 1, 31)), 'January 31st, 2026');
    assert.equal(formatFullDate(on(2024, 2, 29)), 'February 29th, 2024');
  });
});

describe('the weekday', () => {
  it('spells it out in full', () => {
    assert.equal(formatWeekday(on(2026, 10, 5)), 'Monday');
    assert.equal(formatWeekday(on(2026, 10, 11)), 'Sunday');
  });
});
