import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { emptyRuns, formatLength, laySpans, lengthScale, lineSpans, lineUp, minuteAt, pickNext } from './timeline.ts';

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
    assert.deepEqual(span?.items.map((i) => [i.id, i.lane, i.lanes, i.start]), [
      ['block', 0, 1, at(9)],
      ['plain', 0, 1, at(10)],
    ]);
  });

  // A 40-minute walk at 8 with Coffee at 8:15 and Push-ups at 8:34 split the
  // row into three slivers too thin to read or tap. One column, in order.
  it('puts a thing with no length under what is above it, never beside it', () => {
    const [span] = laySpans([
      { id: 'walk', start: at(8), minutes: 40 },
      { id: 'coffee', start: at(8, 15), minutes: null },
      { id: 'pushups', start: at(8, 34), minutes: null },
    ]);
    assert.deepEqual(span?.items.map((i) => [i.id, i.lane, i.lanes, i.start]), [
      ['walk', 0, 1, at(8)],
      ['coffee', 0, 1, at(8, 40)],
      ['pushups', 0, 1, at(9, 10)],
    ]);
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
    assert.equal(late?.end, at(10, 30));
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

describe('folding empty hours', () => {
  it('folds the empty middle', () => {
    assert.deepEqual(emptyRuns(7, 12, new Set([7, 12])), [{ from: 8, to: 12 }]);
  });
  it('leaves a single empty hour alone', () => {
    assert.deepEqual(emptyRuns(7, 9, new Set([7, 9])), []);
  });
  it('folds runs at both edges of the day', () => {
    assert.deepEqual(emptyRuns(0, 23, new Set([9])), [{ from: 0, to: 9 }, { from: 10, to: 24 }]);
  });
  it('never hides the NOW hour', () => {
    assert.deepEqual(emptyRuns(7, 12, new Set([7]), 10), [{ from: 8, to: 10 }, { from: 11, to: 13 }]);
  });
});

describe('the day as one line', () => {
  const slot = (id: string, start: number, minutes: number | null = null, rank = 2) => ({ id, start, minutes, rank });
  const ids = (rows: ReturnType<typeof lineUp>) => rows.map((r) => (r.kind === 'item' ? r.id : r.kind));

  it('goes in time order, a moment first when the minute is shared', () => {
    assert.deepEqual(ids(lineUp([slot('late', at(9, 30)), slot('habit', at(9)), slot('moment', at(9), null, 0)])), ['moment', 'habit', 'late']);
  });
  it('marks a long stretch as free, counted from where the last thing ends', () => {
    assert.deepEqual(lineUp([slot('a', at(9), 30), slot('b', at(12))])[1], { kind: 'free', minutes: 150 });
  });
  it('does not mark a short gap', () => {
    assert.deepEqual(ids(lineUp([slot('a', at(9), 30), slot('b', at(10))])), ['a', 'b']);
  });
  it('puts now before the first thing still to come, or last', () => {
    assert.deepEqual(ids(lineUp([slot('a', at(9)), slot('b', at(9, 30))], at(9, 10))), ['a', 'now', 'b']);
    assert.deepEqual(ids(lineUp([slot('a', at(9))], at(20))), ['a', 'now']);
  });
  it('gives each row the stretch up to the next one, a free row what is empty', () => {
    const rows = lineUp([slot('a', at(9), 30), slot('b', at(12))]);
    assert.deepEqual(lineSpans(rows), [{ from: at(9), to: at(9, 30) }, { from: at(9, 30), to: at(12) }, { from: at(12), to: at(14) }]);
  });
  it('reads a drop as the nearest 5 minutes, inside its stretch', () => {
    assert.equal(minuteAt(at(9), at(10), 0.5), at(9, 30));
    assert.equal(minuteAt(at(9), at(9, 47), 0.5), at(9, 25));
    assert.equal(minuteAt(at(9), at(10), 3), at(10));
    assert.equal(minuteAt(at(23), at(23, 59), 1), at(23, 55));
  });
});

it('lengthScale grows with length and stops at twice', () => {
  assert.deepEqual([null, 15, 30, 60, 120, 600].map(lengthScale), [1, 1, 1.25, 1.5, 2, 2]);
  assert.equal(lengthScale(45), 1.375);
});

it('pickNext goes by the schedule alone', () => {
  const item = (id: string, kind: 'calendar' | 'todo' | 'habit', start: number | null, minutes: number | null = null, done = false) => ({ id, kind, start, minutes, done });
  // Earliest end wins among what is on, and a finished one never counts.
  assert.equal(pickNext([item('w', 'todo', 540, 60), item('s', 'calendar', 570, 30), item('p', 'todo', 585, 30)], 590)?.id, 's');
  assert.deepEqual(pickNext([item('s', 'calendar', 570, 30), item('w', 'todo', 540, 30, true)], 559), pickNext([item('s', 'calendar', 570, 30)], 559));
  // No length: on for 15 minutes, then it's behind us.
  assert.equal(pickNext([item('h', 'habit', 600)], 610)?.state, 'since');
  assert.equal(pickNext([item('h', 'habit', 600)], 615), null);
  // Coming up, then Anytime, and a missed one is never brought back.
  assert.deepEqual(pickNext([item('t', 'todo', 660)], 648), { id: 't', kind: 'todo', start: 660, state: 'in', minute: 12 });
  assert.equal(pickNext([item('late', 'todo', 540), item('any', 'habit', null)], 900)?.id, 'any');
});
