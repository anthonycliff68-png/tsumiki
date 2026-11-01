import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shortDay, tickedCount, toLookRows, type Sorted } from './brainDump.ts';

const empty: Sorted = { timeline: [], todos: [], notes: [], habits: [] };
const sorted: Sorted = {
  timeline: [{ title: 'Call mum', day: '2026-10-31', time: '17:00', momentId: null }],
  todos: [{ title: 'Email landlord', day: '2026-10-31' }],
  notes: [{ title: 'Serve fixes', folder: 'roundnet', isNewFolder: true, emoji: '🥏', body: '- toss lower' }],
  habits: [{ name: 'Stretch', momentId: 'm-1', time: null }],
};

describe('toLookRows', () => {
  it('leaves habits unticked and ticks everything else', () => {
    const rows = toLookRows(sorted, []);
    assert.deepEqual(
      rows.map((r) => [r.kind, r.ticked]),
      [
        ['timeline', true],
        ['todo', true],
        ['note', true],
        ['habit', false],
      ],
    );
  });

  it('files into an existing folder whatever its case', () => {
    const note = toLookRows(sorted, [{ name: 'Roundnet' }]).find((r) => r.kind === 'note');
    assert.equal(note?.folder, 'Roundnet');
    assert.equal(note?.isNewFolder, false);
  });

  it('gives nothing for an empty sort', () => {
    assert.deepEqual(toLookRows(empty, []), []);
  });
});

describe('tickedCount', () => {
  it('ignores unticked rows', () => {
    assert.equal(tickedCount(toLookRows(sorted, [])), 3);
  });
});

describe('shortDay', () => {
  it('says nothing for today and the short weekday otherwise', () => {
    assert.equal(shortDay('2026-10-31', '2026-10-31'), null);
    assert.equal(shortDay('2026-11-05', '2026-10-31'), 'Thu');
  });
});
