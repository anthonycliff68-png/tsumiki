import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readyForReview } from './review.ts';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const OLD = '2026-11-01T12:00:00Z';
const TODAY = '2026-11-10T09:00:00Z';

describe('readyForReview', () => {
  it('never on the first day, whatever happened', () => {
    assert.equal(readyForReview({ why: 'dump', accountCreated: TODAY, now: NOW, checkinDays: [] }), false);
    assert.equal(
      readyForReview({ why: 'checkin', accountCreated: TODAY, now: NOW, checkinDays: ['a', 'b', 'c'] }),
      false,
    );
  });
  it('a kept brain dump is enough after that', () => {
    assert.equal(readyForReview({ why: 'dump', accountCreated: OLD, now: NOW, checkinDays: [] }), true);
  });
  it('check-ins need three different days, not three check-ins', () => {
    const days = (d: string[]) => readyForReview({ why: 'checkin', accountCreated: OLD, now: NOW, checkinDays: d });
    assert.equal(days(['2026-11-08', '2026-11-08', '2026-11-09']), false);
    assert.equal(days(['2026-11-08', '2026-11-09', '2026-11-10']), true);
  });
  it('a missing or broken account date reads as not ready', () => {
    assert.equal(readyForReview({ why: 'dump', accountCreated: '', now: NOW, checkinDays: [] }), false);
  });
});
