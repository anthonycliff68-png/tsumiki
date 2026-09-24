/**
 * The emailed sign-in code: what counts as a code, and what to say when one
 * is refused.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CODE_MAX, CODE_MIN, longEnough, normaliseCode, readCodeError } from './otp.ts';

describe('what counts as a code', () => {
  it('keeps a six-digit code whole', () => {
    assert.equal(normaliseCode('482915'), '482915');
  });

  it('keeps a longer code whole, because the length is a server setting', () => {
    assert.equal(normaliseCode('48291573'), '48291573');
    assert.equal(normaliseCode('4829157301'), '4829157301');
  });

  it('drops anything that is not a digit', () => {
    assert.equal(normaliseCode('48-29 15'), '482915');
    assert.equal(normaliseCode('code: 48291573'), '48291573');
  });

  it('stops at the longest code Supabase will send', () => {
    assert.equal(normaliseCode('4829157301777'), '4829157301');
    assert.equal(normaliseCode('4829157301777').length, CODE_MAX);
  });

  it('survives an empty field and a field of rubbish', () => {
    assert.equal(normaliseCode(''), '');
    assert.equal(normaliseCode('abc def'), '');
  });

  it('is worth sending from six digits up', () => {
    assert.equal(longEnough(''), false);
    assert.equal(longEnough('48291'), false);
    assert.equal(longEnough('482915'), true);
    assert.equal(longEnough('48291573'), true);
    assert.equal(CODE_MIN, 6);
    assert.equal(CODE_MAX, 10);
  });
});

describe('why a code was refused', () => {
  it('knows a code that has timed out', () => {
    assert.equal(readCodeError('Token has expired or is invalid'), 'expired');
    assert.equal(readCodeError('Email link has expired'), 'expired');
  });

  it('knows a code that has already been spent', () => {
    assert.equal(readCodeError('Token has already been used'), 'expired');
  });

  it('knows a code that simply never matched', () => {
    assert.equal(readCodeError('Invalid token'), 'wrong');
  });

  it('does not dress up something it has never seen', () => {
    assert.equal(readCodeError('Network request failed'), 'other');
    assert.equal(readCodeError('For security purposes, you can only request this after 51s'), 'other');
  });
});
