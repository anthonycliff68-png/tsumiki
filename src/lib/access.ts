import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useMyProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { decideAccess, type Access } from '@/lib/entitlement';
import { configurePurchases, currentOffering, isSubscribed } from '@/lib/purchases';

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

  const loading = profile.isPending || sub.isPending;

  // While we do not know, let them in. A spinner over someone's own habits
  // because a network call is slow is the wrong way round.
  if (loading || !profile.data) {
    return { access: { state: 'subscribed' }, loading };
  }

  return {
    access: decideAccess({
      accountCreatedAt: profile.data.created_at,
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
