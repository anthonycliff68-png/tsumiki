import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatTime, formatTimeGutter, fromTimeString, toTimeString } from './times.ts';

describe('reading a time', () => {
  // The bug this exists to stop: a compact form that dropped am/pm, so a
  // routine row said "1:30" for both half one in the afternoon and half one at
  // night. Every form has to say which.
  it('always says am or pm', () => {
    assert.equal(formatTime('13:30'), '1:30 pm');
    assert.equal(formatTime('01:30'), '1:30 am');
    assert.equal(formatTimeGutter('13:30'), '1:30 pm');
    assert.equal(formatTimeGutter('01:30'), '1:30 am');
  });

  it('calls both twelves by the right name', () => {
    assert.equal(formatTime('00:15'), '12:15 am');
    assert.equal(formatTime('12:15'), '12:15 pm');
    assert.equal(formatTimeGutter('00:00'), '12 am');
    assert.equal(formatTimeGutter('12:00'), '12 pm');
  });

  it('drops the minutes on the hour, but only in the gutter', () => {
    assert.equal(formatTimeGutter('09:00'), '9 am');
    assert.equal(formatTime('09:00'), '9:00 am');
  });

  it('reads a stored value with seconds on it', () => {
    assert.equal(formatTime('22:30:00'), '10:30 pm');
  });
});

describe('round tripping a time', () => {
  it('survives the trip out and back', () => {
    for (const value of ['00:00', '07:05', '12:00', '13:30', '23:59']) {
      assert.equal(toTimeString(fromTimeString(value)), value);
    }
  });
});
