import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { byOpened, groupByDay, openedLabel, openedSections, parseNoteBody, splitCapture } from './notes.ts';

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

describe('byOpened', () => {
  const notes = [
    { id: 'a', createdAt: '2026-11-20T10:00:00Z' },
    { id: 'b', createdAt: '2026-11-19T10:00:00Z' },
    { id: 'c', createdAt: '2026-11-18T10:00:00Z' },
  ];
  it('puts the last opened first, and never-opened ones by when they were written', () => {
    assert.deepEqual(byOpened(notes, { c: Date.parse('2026-11-21T09:00:00Z') }).map((n) => n.id), ['c', 'a', 'b']);
  });
});

describe('openedLabel', () => {
  const now = new Date(2026, 10, 21, 15, 0);
  it('reads like a glance', () => {
    assert.equal(openedLabel(new Date(2026, 10, 21, 14, 30).getTime(), now), 'Just now');
    assert.equal(openedLabel(new Date(2026, 10, 21, 12, 0).getTime(), now), '3h');
    assert.equal(openedLabel(new Date(2026, 10, 20, 9, 40).getTime(), now), '9:40 AM');
    assert.equal(openedLabel(new Date(2026, 10, 17, 9, 0).getTime(), now), 'Tue');
    assert.equal(openedLabel(new Date(2026, 9, 26, 9, 0).getTime(), now), 'Oct 26');
  });
  it('never says today\'s own weekday, and a time ahead of the clock is just now', () => {
    assert.equal(openedLabel(new Date(2026, 10, 14, 18, 0).getTime(), now), 'Nov 14');
    assert.equal(openedLabel(new Date(2026, 10, 22, 9, 0).getTime(), now), 'Just now');
  });
});

describe('splitCapture', () => {
  it('takes the first line as the title', () => {
    assert.deepEqual(splitCapture('  Buy a charger\nthe braided one\n'), { title: 'Buy a charger', body: 'the braided one' });
    assert.deepEqual(splitCapture('Just a title'), { title: 'Just a title', body: '' });
  });
});

describe('openedSections', () => {
  it('splits into today, yesterday, this week and earlier, skipping empty ones', () => {
    const now = new Date(2026, 10, 21, 15, 0);
    const at = (d: number, h = 9) => new Date(2026, 10, d, h).toISOString();
    const notes = [
      { id: 'old', createdAt: at(2) },
      { id: 'tue', createdAt: at(17) },
      { id: 'today', createdAt: at(21) },
      { id: 'openedYesterday', createdAt: at(1) },
    ];
    const opened = { openedYesterday: new Date(2026, 10, 20, 8).getTime() };
    assert.deepEqual(
      openedSections(notes, opened, now).map((s) => [s.section, s.notes.map((n) => n.id)]),
      [['today', ['today']], ['yesterday', ['openedYesterday']], ['week', ['tue']], ['earlier', ['old']]],
    );
  });
  it('keeps one section each when a time is ahead of the clock or a week back to the weekday', () => {
    const now = new Date(2026, 10, 21, 15, 0);
    const notes = ['ahead', 'now', 'lastSat', 'sun'].map((id) => ({ id, createdAt: new Date(2026, 0, 1).toISOString() }));
    const opened = {
      ahead: new Date(2026, 10, 22, 9).getTime(),
      now: new Date(2026, 10, 21, 14).getTime(),
      lastSat: new Date(2026, 10, 14, 18).getTime(),
      sun: new Date(2026, 10, 15, 9).getTime(),
    };
    assert.deepEqual(
      openedSections(notes, opened, now).map((s) => [s.section, s.notes.map((n) => n.id)]),
      [['today', ['ahead', 'now']], ['week', ['sun']], ['earlier', ['lastSat']]],
    );
  });
});
