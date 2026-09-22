import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * An invite code tapped before signing in. Held here so the join can carry on
 * after the magic link comes back.
 *
 * This survives sign-in, not installation. Landing in the crew after installing
 * the app from a browser needs a deferred deep-link provider, which is still to
 * be set up.
 */
const KEY = 'tsumiki.pending-invite';

export async function rememberInvite(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, code);
  } catch {
    // Not being able to remember it is survivable: the link still works.
  }
}

export async function takePendingInvite(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(KEY);
    if (code) await AsyncStorage.removeItem(KEY);
    return code;
  } catch {
    return null;
  }
}
