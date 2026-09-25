import { useState } from 'react';

import { Paywall, type Plan } from '@/components/Paywall';
import type { Access } from '@/lib/entitlement';

/**
 * A look at the paywall before any of it is wired up.
 *
 * Temporary: delete once RevenueCat drives the real thing. It exists because
 * a paywall is the screen most worth seeing before it is plumbed in, and the
 * numbers are the ones a real seven-day week would produce.
 */
export default function PaywallPreview() {
  const [busy, setBusy] = useState(false);
  const access: Access = { state: 'locked' };

  const pretend = (_plan: Plan) => {
    setBusy(true);
    setTimeout(() => setBusy(false), 1200);
  };

  return (
    <Paywall
      access={access}
      checkIns={17}
      bestRun={6}
      busy={busy}
      error={null}
      onSubscribe={pretend}
      onRestore={() => {}}
      onDeleteAccount={() => {}}
    />
  );
}
