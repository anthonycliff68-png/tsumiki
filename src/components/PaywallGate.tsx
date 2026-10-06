import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { Paywall } from '@/components/Paywall';
import { useAccess, useOffering } from '@/lib/access';
import { hasAccess } from '@/lib/entitlement';
import { usePaywallActions } from '@/lib/paywallActions';

/**
 * Stands in front of the app once the free week is up.
 *
 * It wraps the tabs rather than living inside them, so there is no moment
 * where someone sees their habits and then has them taken away. The one way
 * out other than paying is deleting the account, which Apple requires to stay
 * reachable and which would be indefensible to trap anyway.
 */
export function PaywallGate({ children }: { children: ReactNode }) {
  const { access } = useAccess();
  const offering = useOffering();
  const { busy, error, subscribe, bringBack } = usePaywallActions();

  if (hasAccess(access)) return <>{children}</>;

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
