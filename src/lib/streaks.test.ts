import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { streakOf } from './streaks.ts';

const run = (pattern: string) =>
  pattern.split('').map((c, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, done: c === 'x' }));

describe('a personal streak', () => {
  it('counts the due days done', () => {
    assert.deepEqual(streakOf(run('xxxx')), { days: 4, state: 'running' });
  });

  // The same rule the crews use, so there is one rule in the app and not two.
  it('forgives a single miss and keeps counting past it', () => {
    assert.deepEqual(streakOf(run('xx.xx')), { days: 4, state: 'running' });
  });

  it('ends on two misses in a row, however long the run was', () => {
    assert.deepEqual(streakOf(run('xxxxxx..')), { days: 0, state: 'cold' });
  });

  it('is at risk, not broken, the day after one miss', () => {
    assert.deepEqual(streakOf(run('xxx.')), { days: 3, state: 'at-risk' });
  });

  it('clears the forgiveness once a day is done again', () => {
    // Miss, done, miss: the second miss is the first of its own run, not the
    // second of the old one, so nothing has broken yet.
    assert.deepEqual(streakOf(run('xx.x.')), { days: 3, state: 'at-risk' });
  });

  it('has nothing to count before the first due day', () => {
    assert.deepEqual(streakOf([]), { days: 0, state: 'cold' });
  });

  it('is cold, not running, when the only due day was missed', () => {
    assert.deepEqual(streakOf(run('.')), { days: 0, state: 'at-risk' });
  });
});

describe('today is still open', () => {
  const days = run('xxx').concat({ date: '2026-09-04', done: false });

  it('does not count an unchecked today as a miss', () => {
    assert.deepEqual(streakOf(days, '2026-09-04'), { days: 3, state: 'running' });
  });

  it('counts it once the day has passed', () => {
    assert.deepEqual(streakOf(days, '2026-09-05'), { days: 3, state: 'at-risk' });
  });

  it('still counts today when it has been done', () => {
    assert.deepEqual(streakOf(run('xxxx'), '2026-09-04'), { days: 4, state: 'running' });
  });
});
