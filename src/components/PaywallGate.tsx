import { router } from 'expo-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { PurchasesPackage } from 'react-native-purchases';
import { useQueryClient } from '@tanstack/react-query';

import { Paywall, type Plan } from '@/components/Paywall';
import { copy } from '@/copy';
import { useAccess, useOffering } from '@/lib/access';
import { hasAccess } from '@/lib/entitlement';
import { purchase, purchasesAvailable, restore } from '@/lib/purchases';

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
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasAccess(access)) return <>{children}</>;

  const buy = async (pkg: PurchasesPackage | null, _plan: Plan) => {
    if (!purchasesAvailable || !pkg) {
      setError(copy.paywall.unavailable);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await purchase(pkg);
    setBusy(false);
    // A cancelled sheet is a decision, not a failure, and gets no red text.
    if (result === 'cancelled') return;
    if (result === 'failed') {
      setError(copy.paywall.failed);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['subscribed'] });
  };

  const bringBack = async () => {
    setBusy(true);
    setError(null);
    const found = await restore();
    setBusy(false);
    if (!found) {
      setError(copy.paywall.restoredNone);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['subscribed'] });
  };

  return (
    <Paywall
      access={access}
      offering={offering.data}
      busy={busy}
      error={error}
      onSubscribe={(pkg, plan) => void buy(pkg, plan)}
      onRestore={() => void bringBack()}
      onDeleteAccount={() => router.push('/delete-account')}
    />
  );
}
