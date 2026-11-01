import { router } from 'expo-router';

import { useAccess } from '@/lib/access';
import { hasAccess } from '@/lib/entitlement';

/**
 * Free and Pro.
 *
 * Nobody is locked out any more. Everyone gets Free: planning the day, up to
 * five habits and five open to-dos. Pro lifts both caps and adds crews.
 *
 * Pro is exactly who could use the whole app before Free existed — paying,
 * grandfathered, or inside a trial that was already running — so nobody who
 * had everything yesterday has less today.
 */
export const FREE_HABITS = 5;
export const FREE_TODOS = 5;

export function useIsPro(): boolean {
  return hasAccess(useAccess().access);
}

/** Every limit leads here, and says nothing else. The paywall explains. */
export const showUpgrade = () => router.push('/plans');
