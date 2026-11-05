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
  // Saying no leads to Free, wherever the paywall was opened from. Only somebody
  // who already has Pro just goes back.
  const { first, then } = useLocalSearchParams<{ first?: string; then?: string }>();
  const { access, loading } = useAccess();
  // useAccess lets everyone in while it loads, which is no reason to take
  // "Continue to Tsumiki Free" away from somebody who is on Free.
  const isPro = !loading && hasAccess(access);
  const offeringFree = first === '1' && !isPro;

  // Seeing it here is being offered it. Without this the tabs would push the
  // same screen again the moment setting up finished, which is the thing this
  // move was meant to stop.
  useEffect(() => {
    if (first === '1') void AsyncStorage.setItem(PLANS_OFFERED, 'yes').catch(() => {});
  }, [first]);
  const offering = useOffering();
  const trial = useTrialOffer();
  const { busy, error, subscribe, bringBack } = usePaywallActions();

  /**
   * Where the screen goes when it is finished with, whether that is because
   * somebody paid or because they backed out. At the end of setting up there
   * is nothing behind this to go back to — it replaced the last step — so it
   * goes on to wherever onboarding was heading.
   */
  const leave = () => {
    if (first === '1') router.replace((then as '/crews' | undefined) ?? '/');
    else goBack();
  };

  return (
    <Paywall
      access={access}
      offering={offering.data}
      busy={busy}
      error={error}
      /**
       * Leaving on success is the whole point. /plans is pushed on top of the
       * app, so a purchase that only flips the entitlement leaves somebody
       * sitting on the paywall they just paid to clear, with nothing to do but
       * find the way out themselves.
       */
      onSubscribe={(pkg) => {
        void subscribe(pkg).then((done) => {
          if (done) leave();
        });
      }}
      trial={trial}
      onRestore={() => {
        void bringBack().then((found) => {
          if (found) leave();
        });
      }}
      // Always a way out: there is no wall behind this any more, only Free.
      dismissLabel={isPro ? copy.paywall.back : copy.paywall.continueFree}
      closable={!offeringFree}
      onDismiss={leave}
    />
  );
}
