import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAccess } from '@/lib/access';
import { useAuth } from '@/lib/auth';
import { hasAccess } from '@/lib/entitlement';

/**
 * Offers the plans once, the first time someone gets into the app.
 *
 * The flag lives on the device rather than the account, which is what makes a
 * reinstall show it again — and a reinstall is exactly when it earns its keep,
 * because somebody who already paid needs a route to "Restore purchases" and
 * would otherwise have to go looking for one.
 *
 * It waits until after onboarding, because it sits inside the tabs, behind the
 * redirect to routine. Being asked to consider paying before you have set up a
 * single habit would be the wrong order.
 *
 * Renders nothing.
 */
const KEY = 'tsumiki.plansOffered';

export function FirstRunPlans() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const { access, loading } = useAccess();
  /** Once per mount, whatever storage does, so a slow read cannot double-push. */
  const asked = useRef(false);

  useEffect(() => {
    if (!userId || loading || asked.current) return;
    // Somebody locked out meets the wall itself, and somebody already paying
    // has no use for a list of plans.
    if (!hasAccess(access) || access.state === 'subscribed') return;

    asked.current = true;
    void AsyncStorage.getItem(KEY)
      .then((seen) => {
        if (seen === 'yes') return;
        void AsyncStorage.setItem(KEY, 'yes');
        router.push({ pathname: '/plans', params: { first: '1' } });
      })
      // Storage that cannot be read must not mean the paywall on every launch.
      .catch(() => undefined);
  }, [userId, loading, access]);

  return null;
}
