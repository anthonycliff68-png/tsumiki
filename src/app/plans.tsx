import { router } from 'expo-router';

import { Paywall } from '@/components/Paywall';
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
    />
  );
}
