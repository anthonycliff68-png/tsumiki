/**
 * When a push is allowed to go out. Run with: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  deliverableAt,
  isQuiet,
  momentOf,
  nudgeBody,
  shouldDeliverNudge,
  shouldSendReminder,
  toMinutes,
  type NudgeInput,
  type ReminderInput,
} from './delivery.ts';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const MONDAY = 1;

function reminder(overrides: Partial<ReminderInput> = {}): ReminderInput {
  return {
    mode: 'after',
    anchorTime: '12:30',
    atTime: null,
    nowMinutes: toMinutes('12:35'),
    weekday: MONDAY,
    daysOfWeek: EVERY_DAY,
    checkedIn: false,
    alreadySent: false,
    quietStart: '22:00',
    quietEnd: '07:00',
    pausedForMinutes: 0,
    ...overrides,
  };
}

function nudge(overrides: Partial<NudgeInput> = {}): NudgeInput {
  return {
    mode: 'after',
    anchorTime: '12:30',
    atTime: null,
    nowMinutes: toMinutes('12:35'),
    checkedIn: false,
    alreadyDelivered: false,
    quietStart: '22:00',
    quietEnd: '07:00',
    pausedForMinutes: 0,
    ...overrides,
  };
}

describe('quiet hours', () => {
  it('wraps around midnight', () => {
    assert.equal(isQuiet(toMinutes('23:30'), '22:00', '07:00'), true);
    assert.equal(isQuiet(toMinutes('03:00'), '22:00', '07:00'), true);
    assert.equal(isQuiet(toMinutes('06:59'), '22:00', '07:00'), true);
    assert.equal(isQuiet(toMinutes('07:00'), '22:00', '07:00'), false);
    assert.equal(isQuiet(toMinutes('12:00'), '22:00', '07:00'), false);
    assert.equal(isQuiet(toMinutes('21:59'), '22:00', '07:00'), false);
  });

  it('handles quiet hours inside one day', () => {
    assert.equal(isQuiet(toMinutes('14:00'), '13:00', '15:00'), true);
    assert.equal(isQuiet(toMinutes('16:00'), '13:00', '15:00'), false);
  });

  it('treats equal start and end as no quiet hours at all', () => {
    assert.equal(isQuiet(toMinutes('03:00'), '00:00', '00:00'), false);
  });

  it('holds a moment inside quiet hours until they end', () => {
    assert.equal(deliverableAt(toMinutes('23:00'), '22:00', '07:00'), toMinutes('07:00'));
    assert.equal(deliverableAt(toMinutes('05:00'), '22:00', '07:00'), toMinutes('07:00'));
  });

  it('leaves a moment outside quiet hours where it is', () => {
    assert.equal(deliverableAt(toMinutes('12:30'), '22:00', '07:00'), toMinutes('12:30'));
  });
});

describe('a habit\'s moment', () => {
  it('is the anchor\'s time when stacked', () => {
    assert.equal(momentOf('after', '08:15', null), toMinutes('08:15'));
  });

  it('is its own time when set to a clock', () => {
    assert.equal(momentOf('at', null, '18:30'), toMinutes('18:30'));
  });

  it('is 8pm for an anytime habit', () => {
    assert.equal(momentOf('any', null, null), toMinutes('20:00'));
  });

  it('is nothing when a stacked habit has lost its anchor', () => {
    assert.equal(momentOf('after', null, null), null);
  });
});

describe('reminders', () => {
  it('goes out once the moment has passed', () => {
    assert.deepEqual(shouldSendReminder(reminder()), { send: true });
  });

  it('waits until the moment', () => {
    const decision = shouldSendReminder(reminder({ nowMinutes: toMinutes('11:00') }));
    assert.deepEqual(decision, { send: false, reason: 'too-early' });
  });

  it('does not go out once checked in', () => {
    assert.deepEqual(shouldSendReminder(reminder({ checkedIn: true })), {
      send: false,
      reason: 'checked-in',
    });
  });

  it('goes out only once a day', () => {
    assert.deepEqual(shouldSendReminder(reminder({ alreadySent: true })), {
      send: false,
      reason: 'already-sent',
    });
  });

  it('skips a day the habit is not scheduled on', () => {
    assert.deepEqual(shouldSendReminder(reminder({ daysOfWeek: [0, 6] })), {
      send: false,
      reason: 'not-scheduled',
    });
  });

  it('stays quiet while someone is heading out', () => {
    assert.deepEqual(shouldSendReminder(reminder({ pausedForMinutes: 12 })), {
      send: false,
      reason: 'paused',
    });
  });

  it('says nothing during quiet hours', () => {
    const decision = shouldSendReminder(
      reminder({ mode: 'any', anchorTime: null, nowMinutes: toMinutes('23:30') }),
    );
    assert.deepEqual(decision, { send: false, reason: 'quiet' });
  });

  it('gives up on a reminder hours stale rather than buzzing at bedtime', () => {
    const decision = shouldSendReminder(reminder({ nowMinutes: toMinutes('20:00') }));
    assert.deepEqual(decision, { send: false, reason: 'stale' });
  });

  it('sends an anytime habit its 8pm reminder', () => {
    const decision = shouldSendReminder(
      reminder({ mode: 'any', anchorTime: null, nowMinutes: toMinutes('20:05') }),
    );
    assert.deepEqual(decision, { send: true });
  });

  it('holds a late-night habit until quiet hours end', () => {
    const late = reminder({ mode: 'at', anchorTime: null, atTime: '23:00' });
    assert.deepEqual(shouldSendReminder({ ...late, nowMinutes: toMinutes('23:05') }), {
      send: false,
      reason: 'quiet',
    });
    assert.deepEqual(shouldSendReminder({ ...late, nowMinutes: toMinutes('07:05') }), {
      send: true,
    });
  });
});

describe('nudges', () => {
  it('goes out when their moment has come', () => {
    assert.deepEqual(shouldDeliverNudge(nudge()), { send: true });
  });

  it('waits for their moment rather than landing hours early', () => {
    assert.deepEqual(shouldDeliverNudge(nudge({ nowMinutes: toMinutes('09:00') })), {
      send: false,
      reason: 'too-early',
    });
  });

  it('is still worth delivering late, unlike a reminder', () => {
    assert.deepEqual(shouldDeliverNudge(nudge({ nowMinutes: toMinutes('21:00') })), {
      send: true,
    });
  });

  it('does not arrive once they have checked in', () => {
    assert.deepEqual(shouldDeliverNudge(nudge({ checkedIn: true })), {
      send: false,
      reason: 'checked-in',
    });
  });

  it('never lands inside quiet hours', () => {
    assert.deepEqual(shouldDeliverNudge(nudge({ nowMinutes: toMinutes('02:00') })), {
      send: false,
      reason: 'quiet',
    });
  });

  it('holds off while they are heading out', () => {
    assert.deepEqual(shouldDeliverNudge(nudge({ pausedForMinutes: 5 })), {
      send: false,
      reason: 'paused',
    });
  });

  it('goes straight out when they have no set moment', () => {
    assert.deepEqual(
      shouldDeliverNudge(nudge({ mode: 'after', anchorTime: null, nowMinutes: toMinutes('10:00') })),
      { send: true },
    );
  });
});

describe('the push body', () => {
  it('reads as the brief writes it', () => {
    assert.equal(
      nudgeBody('Walk time!', 'Lunch Loop', 2, 3, false),
      '“Walk time!” Lunch Loop is 2 of 3.',
    );
  });

  it('adds the last-one line only when it is true', () => {
    assert.equal(
      nudgeBody('Walk time!', 'Lunch Loop', 2, 3, true),
      '“Walk time!” Lunch Loop is 2 of 3. You\'re the last one.',
    );
  });
});
