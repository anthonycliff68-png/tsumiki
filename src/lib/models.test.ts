import assert from 'node:assert/strict';
import { test } from 'node:test';

import { faceOf, initialsOf, personName } from './models.ts';

// The bug this exists to stop: a profile whose display_name was never written
// holds an empty string, not null, so `?? 'Someone'` passed it straight through
// and crew tiles rendered blank. Anything that is not a real name has to come
// back as a real word.
test('a name that was never set falls back', () => {
  assert.equal(personName('', 'Someone'), 'Someone');
  assert.equal(personName(null, 'Someone'), 'Someone');
  assert.equal(personName(undefined, 'Someone'), 'Someone');
  assert.equal(personName('   ', 'Someone'), 'Someone');
});

test('a real name is kept, trimmed', () => {
  assert.equal(personName('Ada', 'Someone'), 'Ada');
  assert.equal(personName('  Ada  ', 'Someone'), 'Ada');
});

test('initials come from two words, or the first two letters of one', () => {
  assert.equal(initialsOf('Ada Lovelace'), 'AL');
  assert.equal(initialsOf('Ada'), 'AD');
  assert.equal(initialsOf('  ada lovelace  '), 'AL');
  assert.equal(initialsOf('Ada Byron Lovelace'), 'AB');
  assert.equal(initialsOf(''), '??');
});

// An emoji wins over initials, but only a real one — the column defaults to the
// empty string, so most rows fall through to initials.
test('a chosen emoji replaces the initials', () => {
  assert.equal(faceOf('Ada Lovelace', '🦊'), '🦊');
  assert.equal(faceOf('Ada Lovelace', ''), 'AL');
  assert.equal(faceOf('Ada Lovelace', '   '), 'AL');
  assert.equal(faceOf('Ada Lovelace', null), 'AL');
  assert.equal(faceOf('Ada Lovelace', undefined), 'AL');
});
