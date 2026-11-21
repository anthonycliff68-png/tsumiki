import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_COLORS, dayChoices, EMOJI_CHOICES, guessEmoji, loud, nextStep, todoColor, toOklch } from './dayLook.ts';

const P = ['a', 'b', 'c', 'd', 'e', 'f'];

test('todoColor is stable and spreads across the palette', () => {
  assert.equal(todoColor('abc', P), todoColor('abc', P));
  const seen = new Set(Array.from({ length: 20 }, (_, i) => todoColor(`todo-${i}`, P)));
  assert.ok(seen.size > 1);
});

test('guessEmoji picks from the name', () => {
  assert.equal(guessEmoji('Book a haircut'), '💇');
  assert.equal(guessEmoji('No phone in bed'), '📵');
  assert.equal(guessEmoji('Read 10 pages'), '📖');
  assert.equal(guessEmoji('Drink water'), '💧');
  assert.equal(guessEmoji('Call the dentist'), '🦷');
  assert.equal(guessEmoji('Quarterly taxes'), '');
});

test('the picker has 32 emoji', () => {
  assert.equal(EMOJI_CHOICES.length, 32);
});

test('nextStep is the first open step by position', () => {
  const s = (position: number, done: boolean) => ({ position, done });
  assert.deepEqual(nextStep([s(0, true), s(2, false), s(1, false)]), s(1, false));
  assert.equal(nextStep([s(0, true), s(1, true)]), undefined);
});

test('loud keeps the hue, evens out lightness, and stays a real colour', () => {
  for (const hex of ['#3F5FA8', '#E0A526', '#1F8A8C', '#C2306B', '#5F7384']) {
    const out = loud(hex);
    assert.match(out, /^#[0-9a-f]{6}$/);
    const [L, , h] = toOklch(out);
    assert.ok(Math.abs(L - 0.76) < 0.01, `${hex} -> ${out} lightness ${L}`);
    const dh = Math.abs(h - toOklch(hex)[2]);
    assert.ok(Math.min(dh, 360 - dh) < 4, `${hex} -> ${out} hue moved ${dh}`);
  }
  assert.ok(toOklch(loud('#3F5FA8'))[1] > toOklch('#3F5FA8')[1] * 0.9);
});

test('loud reads rgb() colours too, the way tint() writes them', () => {
  assert.equal(loud('rgb(63, 95, 168)'), loud('#3F5FA8'));
  assert.notEqual(loud('rgb(237, 128, 97)'), loud('rgb(81, 167, 168)'));
});

test('every My Day colour still stands apart once loud', () => {
  const lab = (hex: string) => {
    const [L, C, h] = toOklch(loud(hex));
    return [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];
  };
  for (const a of DAY_COLORS) for (const b of DAY_COLORS) {
    if (a === b) continue;
    const [p, q] = [lab(a), lab(b)];
    assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) >= 0.06, `${a} and ${b} look alike`);
  }
});

test('a trimmed colour stays in its own picker', () => {
  assert.equal(dayChoices('#E07A5F')[0], '#E07A5F');
  assert.equal(dayChoices('#3F5FA8'), DAY_COLORS);
  assert.equal(dayChoices(null), DAY_COLORS);
});
