import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { PurchasesPackage } from 'react-native-purchases';

import { copy } from '@/copy';
import { purchase, purchasesAvailable, restore } from '@/lib/purchases';

/**
 * Buying and restoring, shared by the two places the paywall appears.
 *
 * It shows up twice on purpose. PaywallGate puts it in front of somebody whose
 * week is up, and the You tab lets anyone open it who wants to look — someone
 * grandfathered who would rather pay, someone mid-trial who has decided
 * already, and an App Reviewer, who otherwise has no way to reach a paywall
 * that only appears once an account is locked.
 */
export function usePaywallActions() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Returns true once the purchase has gone through *and* the entitlement has
   * been read back, so a caller can leave the screen knowing the app behind it
   * will let them in. Returning before the refetch would land them on a wall
   * they had just paid to remove.
   */
  const subscribe = async (pkg: PurchasesPackage | null): Promise<boolean> => {
    if (!purchasesAvailable || !pkg) {
      setError(copy.paywall.unavailable);
      return false;
    }
    setBusy(true);
    setError(null);
    const result = await purchase(pkg);
    setBusy(false);
    // A cancelled sheet is a decision, not a failure, and gets no red text.
    if (result === 'cancelled') return false;
    if (result === 'failed') {
      setError(copy.paywall.failed);
      return false;
    }
    await queryClient.invalidateQueries({ queryKey: ['subscribed'] });
    return true;
  };

  const bringBack = async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    const found = await restore();
    setBusy(false);
    if (!found) {
      setError(copy.paywall.restoredNone);
      return false;
    }
    await queryClient.invalidateQueries({ queryKey: ['subscribed'] });
    return true;
  };

  return { busy, error, subscribe, bringBack };
}
