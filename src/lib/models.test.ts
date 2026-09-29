import assert from 'node:assert/strict';
import { test } from 'node:test';

import { personName } from './models.ts';

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
