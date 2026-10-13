/**
 * What goes in the digest, and what must not.
 *
 * The case worth guarding is the address: somebody who left "I would like a
 * reply" switched off wrote in anonymously as far as they are concerned, and a
 * digest that prints their email anyway quietly makes that untrue.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildDigest, type FeedbackRow } from './digest.ts';

const row = (over: Partial<FeedbackRow> = {}): FeedbackRow => ({
  id: 'a',
  message: 'The streak reset and I checked in every day.',
  app_version: '1.2.0',
  platform: 'ios',
  reply_wanted: false,
  created_at: '2026-10-13T09:30:00.000Z',
  email: 'someone@example.com',
  ...over,
});

describe('the feedback digest', () => {
  it('sends nothing when there is nothing', () => {
    // Ninety-six empty emails a day is how a useful job gets muted.
    assert.equal(buildDigest([]), null);
  });

  it('keeps the address out of it when no reply was asked for', () => {
    const d = buildDigest([row({ reply_wanted: false })]);
    assert.ok(d);
    assert.ok(!d.text.includes('someone@example.com'));
    assert.ok(d.text.includes('No reply wanted.'));
  });

  it('includes the address when a reply was asked for', () => {
    const d = buildDigest([row({ reply_wanted: true })]);
    assert.ok(d);
    assert.ok(d.text.includes('Reply to: someone@example.com'));
  });

  it('says so when somebody asked for a reply and has no address', () => {
    // The account was deleted, or signed in with Apple's private relay and the
    // row lost it. Better to say than to print "null".
    const d = buildDigest([row({ reply_wanted: true, email: null })]);
    assert.ok(d);
    assert.ok(d.text.includes('(no address on the account)'));
    assert.ok(!d.text.includes('null'));
  });

  it('counts the ones that want a reply in the subject', () => {
    const d = buildDigest([
      row({ id: 'a', reply_wanted: true }),
      row({ id: 'b', reply_wanted: false }),
      row({ id: 'c', reply_wanted: true }),
    ]);
    assert.ok(d);
    assert.equal(d.subject, 'Tsumiki feedback · 3 new, 2 want a reply');
  });

  it('does not claim a reply is wanted when none is', () => {
    const d = buildDigest([row(), row({ id: 'b' })]);
    assert.ok(d);
    assert.equal(d.subject, 'Tsumiki feedback · 2 new');
  });

  it('keeps every message in the body', () => {
    const d = buildDigest([
      row({ id: 'a', message: 'first thing' }),
      row({ id: 'b', message: 'second thing' }),
    ]);
    assert.ok(d);
    assert.ok(d.text.includes('first thing'));
    assert.ok(d.text.includes('second thing'));
  });

  it('survives a row with nothing but a message', () => {
    const d = buildDigest([
      row({ app_version: null, platform: null, created_at: 'not a date' }),
    ]);
    assert.ok(d);
    assert.ok(d.text.includes('The streak reset'));
  });
});
