import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ELIGIBILITY, trialFrom } from './trialOffer.ts';

const threeDays = { periodUnit: 'DAY', periodNumberOfUnits: 3 };

describe('what the paywall may promise', () => {
  it('offers the trial when StoreKit says this Apple ID is eligible', () => {
    assert.deepEqual(
      trialFrom({ introPrice: threeDays, eligibility: ELIGIBILITY.eligible }),
      { days: 3 },
    );
  });

  // The expensive case. Apple allows one introductory offer per Apple ID per
  // subscription group, for ever — so somebody who trialled annual and
  // cancelled is charged the moment they tap. The button must not say "free".
  it('offers nothing to somebody who has already used their one trial', () => {
    assert.equal(trialFrom({ introPrice: threeDays, eligibility: ELIGIBILITY.ineligible }), null);
  });

  it('offers nothing when the product has no offer configured', () => {
    assert.equal(trialFrom({ introPrice: null, eligibility: ELIGIBILITY.eligible }), null);
  });

  it('offers nothing when StoreKit reports no offer exists', () => {
    assert.equal(trialFrom({ introPrice: threeDays, eligibility: ELIGIBILITY.noOffer }), null);
  });

  // Unknown means RevenueCat could not resolve the subscription group. The two
  // ways of being wrong are not equal: promising a trial that never arrives is
  // far worse than failing to mention one that does.
  it('treats unknown eligibility as no trial rather than guessing', () => {
    assert.equal(trialFrom({ introPrice: threeDays, eligibility: ELIGIBILITY.unknown }), null);
  });

  it('reads the real length rather than assuming three days', () => {
    assert.deepEqual(
      trialFrom({
        introPrice: { periodUnit: 'WEEK', periodNumberOfUnits: 2 },
        eligibility: ELIGIBILITY.eligible,
      }),
      { days: 14 },
    );
    assert.deepEqual(
      trialFrom({
        introPrice: { periodUnit: 'MONTH', periodNumberOfUnits: 1 },
        eligibility: ELIGIBILITY.eligible,
      }),
      { days: 30 },
    );
  });

  it('survives a period unit it has never heard of', () => {
    assert.equal(
      trialFrom({
        introPrice: { periodUnit: 'FORTNIGHT', periodNumberOfUnits: 1 },
        eligibility: ELIGIBILITY.eligible,
      }),
      null,
    );
  });

  // Android does not report eligibility at all, so the field is absent rather
  // than unknown. There, a configured offer is taken at face value.
  it('trusts a configured offer when eligibility was never looked up', () => {
    assert.deepEqual(trialFrom({ introPrice: threeDays }), { days: 3 });
  });
});
