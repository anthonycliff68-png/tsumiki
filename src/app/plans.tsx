import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { goBack } from '@/lib/back';
import { PLANS_OFFERED } from '@/components/FirstRunPlans';
import { Paywall } from '@/components/Paywall';
import { copy } from '@/copy';
import { useAccess, useOffering, useTrialOffer } from '@/lib/access';
import { hasAccess } from '@/lib/entitlement';
import { usePaywallActions } from '@/lib/paywallActions';

/**
 * The paywall, opened on purpose rather than met at a wall.
 *
 * Until this existed the paywall could only be reached by being locked out of
 * the app, which made it unreachable for everyone it should still be offered
 * to: anybody grandfathered, anybody inside their free week, and App Review,
 * who cannot approve a subscription they are unable to open.
 */
export default function PlansScreen() {
  // The offer shown once after onboarding says what dismissing it does. Opened
  // from You it is just a screen you came to look at, so the way out says so.
  const { first, then } = useLocalSearchParams<{ first?: string; then?: string }>();
  const { access } = useAccess();

  // Seeing it here is being offered it. Without this the tabs would push the
  // same screen again the moment setting up finished, which is the thing this
  // move was meant to stop.
  useEffect(() => {
    if (first === '1') void AsyncStorage.setItem(PLANS_OFFERED, 'yes').catch(() => {});
  }, [first]);
  const offering = useOffering();
  const trial = useTrialOffer();
  const { busy, error, subscribe, bringBack } = usePaywallActions();

  return (
    <Paywall
      access={access}
      offering={offering.data}
      busy={busy}
      error={error}
      onSubscribe={(pkg) => void subscribe(pkg)}
      // The annual plan is what the screen opens on. The paywall swaps this
      // itself when somebody switches to monthly.
      trial={trial.annual}
      onRestore={() => void bringBack()}
      onDeleteAccount={() => router.push('/delete-account')}
      /**
       * No way out for somebody who is locked, because there is nowhere to go:
       * the tabs behind this are wrapped in the same paywall, so a "Not now"
       * would dismiss one wall straight into another. It is an offer only for
       * the people who can still use the app — anyone grandfathered, anyone
       * inside a trial that was already running, anyone already paying.
       */
      dismissLabel={
        !hasAccess(access) ? undefined : first === '1' ? copy.paywall.notNow : copy.paywall.back
      }
      /**
       * At the end of setting up there is nothing behind this to go back to —
       * it replaced the last step — so dismissing goes on to wherever
       * onboarding was heading. Opened from You it is a screen you came to
       * look at, and goBack is right.
       */
      onDismiss={
        !hasAccess(access)
          ? undefined
          : () => {
              if (first === '1') router.replace((then as '/crews' | undefined) ?? '/');
              else goBack();
            }
      }
    />
  );
}
