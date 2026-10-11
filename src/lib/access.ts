import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useMyProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { decideAccess, type Access } from '@/lib/entitlement';
import {
  configurePurchases,
  currentOffering,
  isSubscribed,
  subscriptionExpiry,
  trialEligibility,
} from '@/lib/purchases';
import { trialFrom, type TrialOffer } from '@/lib/trialOffer';
import { supabase } from '@/lib/supabase';

/**
 * What this person may do, decided once and read everywhere.
 *
 * Two facts go in — when the account was made, and whether RevenueCat says
 * an entitlement is active — and entitlement.ts turns them into an answer.
 * Neither this file nor the UI gets to invent rules of its own.
 */
export function useAccess(): { access: Access; loading: boolean } {
  const { session } = useAuth();
  const userId = session?.user.id;
  const profile = useMyProfile(userId);

  // RevenueCat needs to know who this is before it can answer anything.
  useEffect(() => {
    if (userId) void configurePurchases(userId);
  }, [userId]);

  const sub = useQuery({
    queryKey: ['subscribed', userId],
    enabled: Boolean(userId),
    queryFn: isSubscribed,
    // A purchase on another device should turn up without a restart.
    staleTime: 60_000,
  });

  // Mirror the expiry onto the profile so the nightly streak job can tell who
  // is locked out. It cannot ask RevenueCat, and a locked member must stop
  // counting as due or one lapsed trial resets four other people's streak.
  useEffect(() => {
    if (!userId || sub.data === undefined) return;
    void subscriptionExpiry().then((until) =>
      supabase.from('profiles').update({ subscribed_until: until }).eq('id', userId),
    );
  }, [userId, sub.data]);

  const loading = profile.isPending || sub.isPending;

  // While we do not know, let them in. A spinner over someone's own habits
  // because a network call is slow is the wrong way round.
  if (loading || !profile.data) {
    return { access: { state: 'subscribed' }, loading };
  }

  return {
    access: decideAccess({
      accountCreatedAt: profile.data.created_at,
      trialStartedAt: profile.data.trial_started_at,
      subscribed: sub.data === true,
    }),
    loading,
  };
}

/** The live offering, so the paywall shows App Store prices rather than ours. */
export function useOffering() {
  return useQuery({
    queryKey: ['offering'],
    queryFn: currentOffering,
    staleTime: 10 * 60_000,
  });
}

/**
 * The trial this Apple ID would actually get on each plan.
 *
 * Two facts are needed and neither may be assumed: whether the product has an
 * introductory offer configured, and whether this particular Apple ID has
 * already used the one offer Apple allows per subscription group. The second
 * is the one that matters — a returning customer is charged immediately, and
 * a button promising them free days would be a lie the App Store takes
 * seriously.
 */
export function useTrialOffer(): {
  annual: TrialOffer | null;
  monthly: TrialOffer | null;
  known: boolean;
} {
  const offering = useOffering();
  const annualProduct = offering.data?.annual?.product ?? null;
  const monthlyProduct = offering.data?.monthly?.product ?? null;

  const ids = [annualProduct?.identifier, monthlyProduct?.identifier].filter(
    (id): id is string => typeof id === 'string',
  );

  const eligibility = useQuery({
    queryKey: ['intro-eligibility', ...ids],
    enabled: ids.length > 0,
    queryFn: () => trialEligibility(ids),
    // Cannot change without a purchase, and a purchase reloads everything.
    staleTime: 10 * 60_000,
  });

  const read = (product: typeof annualProduct) =>
    product
      ? trialFrom({
          introPrice: product.introPrice,
          eligibility: eligibility.data?.[product.identifier],
        })
      : null;

  return {
    annual: read(annualProduct),
    monthly: read(monthlyProduct),
    // Until the store has answered, the paywall says "Subscribe" rather than
    // guessing at a trial it cannot yet confirm.
    known: !offering.isPending && !eligibility.isPending,
  };
}
