import { router, useLocalSearchParams } from 'expo-router';

import { Paywall } from '@/components/Paywall';
import { copy } from '@/copy';
import { TRIAL_DAYS } from '@/lib/entitlement';
import { useAccess, useOffering } from '@/lib/access';
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
  const { first } = useLocalSearchParams<{ first?: string }>();
  const { access } = useAccess();
  const offering = useOffering();
  const { busy, error, subscribe, bringBack } = usePaywallActions();

  return (
    <Paywall
      access={access}
      offering={offering.data}
      busy={busy}
      error={error}
      onSubscribe={(pkg) => void subscribe(pkg)}
      onRestore={() => void bringBack()}
      onDeleteAccount={() => router.push('/delete-account')}
      dismissLabel={first === '1' ? copy.paywall.notNow(TRIAL_DAYS) : copy.paywall.back}
      onDismiss={() => router.back()}
    />
  );
}
