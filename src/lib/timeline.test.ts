import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatLength, laySpans } from './timeline.ts';

const at = (hour: number, minute = 0) => hour * 60 + minute;

describe('laying out the day', () => {
  it('leaves a day with no lengths as ordinary rows', () => {
    assert.deepEqual(laySpans([{ id: 'a', start: at(9), minutes: null }]), []);
  });

  it('puts what overlaps side by side and what follows back in the first lane', () => {
    const [span] = laySpans([
      { id: 'work', start: at(9), minutes: 210 },
      { id: 'call', start: at(9, 30), minutes: 60 },
      { id: 'lunch', start: at(12, 45), minutes: 30 },
    ]);
    assert.equal(span?.from, 9);
    assert.equal(span?.to, 14);
    assert.deepEqual(span?.items.map((i) => [i.id, i.lane, i.lanes]), [['work', 0, 2], ['call', 1, 2], ['lunch', 0, 1]]);
  });

  it('squeezes only what overlaps, not the whole stretch', () => {
    const [span] = laySpans([
      { id: 'a', start: at(9), minutes: 45 },
      { id: 'b', start: at(9), minutes: 45 },
      { id: 'c', start: at(9), minutes: 45 },
      { id: 'd', start: at(9, 50), minutes: 120 },
      { id: 'e', start: at(11, 50), minutes: null },
    ]);
    assert.deepEqual(span?.items.map((i) => [i.id, i.lane, i.lanes]), [['a', 0, 3], ['b', 1, 3], ['c', 2, 3], ['d', 0, 1], ['e', 0, 1]]);
  });

  it('pulls a thing with no length into the span its hour is in', () => {
    const [span] = laySpans([
      { id: 'block', start: at(9), minutes: 60 },
      { id: 'plain', start: at(9, 15), minutes: null },
      { id: 'later', start: at(10), minutes: null },
    ]);
    assert.deepEqual(span?.items.map((i) => i.id), ['block', 'plain']);
    assert.equal(span?.items[1]?.lane, 1);
  });

  it('keeps separate stretches of the day separate', () => {
    const spans = laySpans([
      { id: 'a', start: at(8), minutes: 30 },
      { id: 'b', start: at(15), minutes: 30 },
    ]);
    assert.deepEqual(spans.map((s) => [s.from, s.to]), [[8, 9], [15, 16]]);
  });

  // 9:50 with a five-minute length still needs a card's worth of room.
  it('gives a short thing room to be read, past the end of its hour if it must', () => {
    const [span] = laySpans([{ id: 'quick', start: at(9, 50), minutes: 5 }]);
    assert.equal(span?.items[0]?.end, at(10, 20));
    assert.equal(span?.to, 11);
    const [late] = laySpans([
      { id: 'hour', start: at(9), minutes: 60 },
      { id: 'plain', start: at(9, 50), minutes: null },
    ]);
    assert.equal(late?.to, 10);
    assert.equal(late?.end, at(10, 20));
  });

  it('never runs past midnight', () => {
    const [span] = laySpans([{ id: 'late', start: at(23, 30), minutes: 120 }]);
    assert.equal(span?.items[0]?.end, at(24));
    assert.equal(span?.to, 24);
  });

  it('stops at three lanes', () => {
    const [span] = laySpans(['a', 'b', 'c', 'd'].map((id) => ({ id, start: at(9), minutes: 60 })));
    assert.equal(span?.items[3]?.lanes, 3);
    assert.equal(span?.items[3]?.lane, 0);
  });

  it('says a length the short way', () => {
    assert.deepEqual([15, 60, 90].map(formatLength), ['15m', '1h', '1h 30m']);
  });
});
