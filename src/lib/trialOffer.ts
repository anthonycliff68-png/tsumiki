/**
 * What the paywall is allowed to promise.
 *
 * Deliberately a pure function with no SDK in it, for the same reason
 * entitlement.ts is: what StoreKit reports is a fact, but *what we say about
 * it* is a rule, and this particular rule decides whether somebody is charged
 * $29.99 under a button that said "free".
 *
 * Apple's rule, which drives all of this: an introductory offer is once per
 * Apple ID per **subscription group**, for ever. Not once per product. Somebody
 * who trialled the annual plan and cancelled gets no trial on the monthly one
 * — they are a returning customer, and the button has to say so. Telling them
 * "start your free trial" and taking their money instantly is not a bug that
 * gets an app rejected, it is the kind that gets one pulled.
 */

/** Mirrors INTRO_ELIGIBILITY_STATUS from react-native-purchases, kept as plain
 *  numbers so this file never has to import the SDK. */
export const ELIGIBILITY = {
  unknown: 0,
  ineligible: 1,
  eligible: 2,
  noOffer: 3,
} as const;

export type TrialOffer = {
  /** Days free before the first charge. */
  days: number;
};

export type OfferInput = {
  /**
   * The product's introductory price, as StoreKit reports it. Null when the
   * product has no offer configured at all.
   */
  introPrice: { periodUnit: string; periodNumberOfUnits: number } | null;
  /** INTRO_ELIGIBILITY_STATUS for this product, if it has been looked up. */
  eligibility?: number;
};

/** Days in each unit Apple will report. Weeks are seven days; months and years
 *  are only ever used here to describe a trial length in words, so the rough
 *  figures are fine and the exact billing date is Apple's problem, not ours. */
const DAYS_IN: Record<string, number> = {
  DAY: 1,
  WEEK: 7,
  MONTH: 30,
  YEAR: 365,
};

/**
 * The trial this person would actually get, or null if they would be charged
 * straight away.
 *
 * Null for four separate reasons, and they are not worth telling apart in the
 * UI — in every one of them the honest button says "Subscribe":
 *
 *   - the product has no introductory offer configured
 *   - StoreKit says this Apple ID has already used it
 *   - StoreKit says the product has no offer
 *   - eligibility is unknown, which happens when RevenueCat cannot resolve the
 *     subscription group. Unknown resolves to *no trial*, because the cost of
 *     being wrong is asymmetric: promising a trial that does not arrive is far
 *     worse than failing to mention one that does.
 */
export function trialFrom({ introPrice, eligibility }: OfferInput): TrialOffer | null {
  if (!introPrice) return null;
  if (eligibility !== undefined && eligibility !== ELIGIBILITY.eligible) return null;

  const perUnit = DAYS_IN[introPrice.periodUnit?.toUpperCase() ?? ''];
  if (!perUnit) return null;

  const days = perUnit * introPrice.periodNumberOfUnits;
  return days > 0 ? { days } : null;
}

/**
 * Whether we know enough to say anything at all yet.
 *
 * While the offering is still loading the paywall must not claim a trial. It
 * also must not claim there isn't one — it says neither, and the button reads
 * "Subscribe" until StoreKit has answered.
 */
export function offerIsKnown(introPrice: unknown, eligibility: number | undefined): boolean {
  return introPrice !== undefined && eligibility !== undefined;
}
