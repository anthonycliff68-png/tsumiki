/**
 * The brain dump is the one paid call in the app. What matters: nobody gets it
 * without an active Pro, and the model is told what it needs to file things.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPrompt, proFromRevenueCat } from './brainDump.ts';

const NOW = new Date('2026-10-31T12:00:00.000Z');
const rc = (pro: unknown) => ({ subscriber: { entitlements: pro === undefined ? {} : { pro } } });

describe('proFromRevenueCat', () => {
  it('is true for an active pro entitlement', () => {
    assert.equal(proFromRevenueCat(rc({ expires_date: '2026-11-30T00:00:00Z' }), NOW), true);
  });
  it('is true for a lifetime grant', () => {
    assert.equal(proFromRevenueCat(rc({ expires_date: null }), NOW), true);
  });
  it('is false once it has expired', () => {
    assert.equal(proFromRevenueCat(rc({ expires_date: '2026-10-30T00:00:00Z' }), NOW), false);
  });
  it('is false with no pro key', () => {
    assert.equal(proFromRevenueCat(rc(undefined), NOW), false);
  });
  it('is false for junk', () => {
    assert.equal(proFromRevenueCat(null, NOW), false);
    assert.equal(proFromRevenueCat({}, NOW), false);
    assert.equal(proFromRevenueCat(rc({ expires_date: 'soon' }), NOW), false);
  });
});

describe('buildPrompt', () => {
  const { system, user } = buildPrompt({
    transcript: 'serve lower next game, call mum at 5',
    localNow: '2026-10-31T17:05',
    timeZone: 'America/Los_Angeles',
    folders: ['Roundnet', 'App ideas'],
    moments: [{ id: 'm-1', label: 'Breakfast', time: '08:00' }],
    habits: ['Read'],
  });

  it('states the local date', () => {
    assert.match(system, /Saturday 2026-10-31/);
  });
  it('lists every folder and moment id', () => {
    assert.match(user, /Roundnet, App ideas/);
    assert.match(user, /id m-1/);
  });
  it('carries the words', () => {
    assert.match(user, /serve lower next game/);
  });
});
