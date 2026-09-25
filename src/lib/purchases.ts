import Constants from 'expo-constants';

import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

/**
 * RevenueCat, kept behind a door.
 *
 * The SDK is native, so it does not exist in Expo Go — importing it at the top
 * of a module would crash the whole app there, and Expo Go is still how the
 * design gets looked at. So it is required lazily and every call degrades to
 * "not subscribed" when it is missing. Nothing here decides who gets access;
 * that is entitlement.ts, which stays pure and testable.
 */

/** Public by design: this key ships inside the binary. The secret is the P8 in App Store Connect. */
const API_KEY = 'appl_HyftWuOnxXjpvJVHDSGVtbrJmwo';

/** The entitlement configured in RevenueCat. Both products grant it. */
export const ENTITLEMENT = 'pro';

/** Expo Go cannot load native modules, and that is a normal state to be in. */
export const purchasesAvailable = Constants.appOwnership !== 'expo';

type Sdk = typeof import('react-native-purchases').default;

let sdk: Sdk | null = null;
let configured = false;

function load(): Sdk | null {
  if (!purchasesAvailable) return null;
  if (sdk) return sdk;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sdk = (require('react-native-purchases') as typeof import('react-native-purchases')).default;
    return sdk;
  } catch {
    return null;
  }
}

/**
 * Point RevenueCat at this person.
 *
 * The Supabase user id is passed as the app user id so a subscription follows
 * the account rather than the device — sign in on a new phone and the
 * entitlement is already there, with no "restore" ritual.
 */
export async function configurePurchases(userId: string): Promise<void> {
  const p = load();
  if (!p) return;
  if (!configured) {
    p.configure({ apiKey: API_KEY, appUserID: userId });
    configured = true;
    return;
  }
  await p.logIn(userId);
}

/** Forget the person on sign-out, so the next account does not inherit their entitlement. */
export async function signOutOfPurchases(): Promise<void> {
  const p = load();
  if (!p || !configured) return;
  try {
    await p.logOut();
  } catch {
    // Logging out of a fresh anonymous id throws; it is not worth surfacing.
  }
}

/**
 * Is the entitlement active right now?
 *
 * False when the SDK is missing, which is the safe direction: entitlement.ts
 * still grants a trial and grandfathering, so nobody is locked out by a
 * missing native module — they simply are not treated as paying.
 */
export async function isSubscribed(): Promise<boolean> {
  const p = load();
  if (!p) return false;
  try {
    const info = await p.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT] !== undefined;
  } catch {
    return false;
  }
}

/** The offering configured as "default", with its annual and monthly packages. */
export async function currentOffering(): Promise<PurchasesOffering | null> {
  const p = load();
  if (!p) return null;
  try {
    const offerings = await p.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export type PurchaseResult = 'subscribed' | 'cancelled' | 'failed';

/** Buy a package. A cancelled sheet is not an error and must not be shown as one. */
export async function purchase(pkg: PurchasesPackage): Promise<PurchaseResult> {
  const p = load();
  if (!p) return 'failed';
  try {
    const { customerInfo } = await p.purchasePackage(pkg);
    return customerInfo.entitlements.active[ENTITLEMENT] ? 'subscribed' : 'failed';
  } catch (e) {
    if (e instanceof Error && 'userCancelled' in e && e.userCancelled === true) return 'cancelled';
    console.warn('Purchase failed', e);
    return 'failed';
  }
}

/** Apple requires a way back to a purchase made on another device or a reinstall. */
export async function restore(): Promise<boolean> {
  const p = load();
  if (!p) return false;
  try {
    const info = await p.restorePurchases();
    return info.entitlements.active[ENTITLEMENT] !== undefined;
  } catch {
    return false;
  }
}
