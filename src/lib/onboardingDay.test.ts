import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildDay, emojiFor, guessTime, momentFor } from './onboardingDay.ts';

describe('setting up a day', () => {
  it('guesses moment times from wake and bed', () => {
    assert.equal(guessTime('coffee', '07:00', '23:00'), '07:30');
    assert.equal(guessTime('lunch', '07:00', '23:00'), '12:30');
  });

  // A guess outside waking hours would put dinner after bedtime.
  it('keeps every guess inside waking hours, night shifts too', () => {
    assert.equal(guessTime('dinner', '06:00', '18:30'), '17:30');
    assert.equal(guessTime('lunch', '20:00', '08:00'), '07:00');
  });

  it('always has wake and bed, in order from waking', () => {
    assert.deepEqual(buildDay('07:00', '23:00', [], []).map((m) => m.key), ['wake', 'bed']);
    assert.deepEqual(
      buildDay('07:00', '23:00', ['lunch', 'coffee'], []).map((m) => m.key),
      ['wake', 'coffee', 'lunch', 'bed'],
    );
    assert.equal(buildDay('07:00', '23:00', [], ['  ']).length, 2);
  });

  it('hangs a habit off wake up when its moment was not picked', () => {
    assert.equal(momentFor('lunch', buildDay('07:00', '23:00', [], [])).key, 'wake');
  });

  it('finds a moment emoji by name', () => {
    assert.equal(emojiFor('lunch'), '🥪');
    assert.equal(emojiFor('Band practice'), '✨');
  });
});
