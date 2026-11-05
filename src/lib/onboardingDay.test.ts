import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildDay, emojiFor, guessTime, momentFor } from './onboardingDay.ts';

describe('setting up a day', () => {
  it('guesses moment times from wake and bed', () => {
    assert.equal(guessTime('coffee', '07:00', '23:00'), '07:30');
    assert.equal(guessTime('breakfast', '07:00', '23:00'), '08:00');
    assert.equal(guessTime('work', '07:00', '23:00'), '09:00');
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

  it('keeps somebody\'s own names and times, and re-sorts by them', () => {
    const day = buildDay('07:00', '23:00', ['coffee', 'lunch'], [], {
      coffee: { label: 'School run', time: '15:00' },
      wake: { label: 'Alarm' },
    });
    assert.deepEqual(
      day.map((m) => [m.key, m.label, m.time]),
      [
        ['wake', 'Alarm', '07:00'],
        ['lunch', 'Lunch', '12:30'],
        ['coffee', 'School run', '15:00'],
        ['bed', 'Bed', '23:00'],
      ],
    );
    assert.equal(day[2]?.emoji, '🎒');
  });

  it('keeps an edit on its own moment when an earlier one is blanked', () => {
    const day = buildDay('07:00', '23:00', [], ['', 'Band practice'], { 'own-1': { time: '20:00' } });
    assert.deepEqual(day[1], { key: 'own-1', label: 'Band practice', emoji: '✨', time: '20:00' });
  });

  it('carries a length only where one was set', () => {
    const day = buildDay('07:00', '23:00', ['work', 'lunch'], [], { work: { time: '09:00', endsAt: '12:30' } });
    assert.equal(day.find((m) => m.key === 'work')?.endsAt, '12:30');
    assert.equal('endsAt' in (day.find((m) => m.key === 'lunch') as object), false);
  });

  it('hangs a habit off wake up when its moment was not picked', () => {
    assert.equal(momentFor('lunch', buildDay('07:00', '23:00', [], [])).key, 'wake');
  });

  it('finds a moment emoji by name', () => {
    assert.equal(emojiFor('lunch'), '🥪');
    assert.equal(emojiFor('Band practice'), '✨');
  });
});

it('sends an evening habit with no dinner to bed, a morning one to wake up', () => {
  const day = buildDay('07:00', '23:00', ['lunch'], []);
  assert.equal(momentFor('dinner', day).key, 'bed');
  assert.equal(momentFor('coffee', day).key, 'wake');
  assert.equal(momentFor('lunch', day).key, 'lunch');
});
