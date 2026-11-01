import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { groupByDay, parseNoteBody } from './notes.ts';

describe('parseNoteBody', () => {
  it('draws headings and bullets', () => {
    assert.deepEqual(parseNoteBody('## Try next\n- toss lower'), [
      { kind: 'heading', text: 'Try next' },
      { kind: 'bullet', text: 'toss lower' },
    ]);
  });
  it('drops blank lines', () => {
    assert.deepEqual(parseNoteBody('one\n\n  \ntwo'), [
      { kind: 'text', text: 'one' },
      { kind: 'text', text: 'two' },
    ]);
  });
  it('leaves a hashtag as text', () => {
    assert.deepEqual(parseNoteBody('#hashtag'), [{ kind: 'text', text: '#hashtag' }]);
  });
});

describe('groupByDay', () => {
  const now = new Date(2026, 9, 31, 18, 0);
  const at = (d: number, h: number) => ({ createdAt: new Date(2026, 9, d, h).toISOString() });

  it('cuts a folder into days, today first', () => {
    const groups = groupByDay([at(31, 9), at(31, 8), at(30, 20), at(26, 7)], now);
    assert.deepEqual(
      groups.map((g) => [g.heading, g.notes.length]),
      [
        ['Today · Sat Oct 31', 2],
        ['Yesterday · Fri Oct 30', 1],
        ['Mon Oct 26', 1],
      ],
    );
  });
});
