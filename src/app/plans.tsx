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
      // The annual plan is what the screen opens on. The paywall swaps this
      // itself when somebody switches to monthly.
      trial={trial.annual}
      onRestore={() => {
        void bringBack().then((found) => {
          if (found) leave();
        });
      }}
      onDeleteAccount={() => router.push('/delete-account')}
      /**
       * No way out for somebody who is locked, because there is nowhere to go:
       * the tabs behind this are wrapped in the same paywall, so dismissing
       * would clear one wall straight into another. It is offered only to the
       * people who can still use the app — anyone grandfathered, anyone inside
       * a trial that was already running, anyone already paying.
       *
       * One label, and it is "Back". There used to be a second, "Not now",
       * shown at the end of setting up — but a locked person never sees any
       * dismiss, so the only people it ever reached were people who already
       * had access, including anyone who had just that second paid. Offering
       * somebody a way to decline immediately after they bought it is nonsense
       * dressed as a choice.
       */
      dismissLabel={hasAccess(access) ? copy.paywall.back : undefined}
      onDismiss={hasAccess(access) ? leave : undefined}
    />
  );
}
