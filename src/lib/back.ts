import { router } from 'expo-router';

/**
 * Go back, and always have somewhere to go.
 *
 * A screen opened by a deep link or a notification is the first thing in the
 * stack, so the usual back() does nothing at all — the control is there, it
 * looks pressable, and nothing happens. That is how the habit screen became a
 * dead end you could only leave by force-quitting.
 */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
