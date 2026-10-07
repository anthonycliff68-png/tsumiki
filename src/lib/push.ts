import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Push registration and the quick actions.
 *
 * Remote push needs a development build — Expo Go cannot receive it — and an
 * Expo project id, which `eas init` writes into app.json. Everything here fails
 * soft when either is missing, so the app still runs without them.
 */

/** The category the OS uses to draw "Check in" and "Heading out now". */
export const HABIT_CATEGORY = 'habit';
export const ACTION_CHECK_IN = 'check-in';
export const ACTION_HEADING_OUT = 'heading-out';

export type PushRegistration =
  | { ok: true; token: string }
  | { ok: false; reason: 'simulator' | 'denied' | 'no-project-id' | 'failed' };

/** Buttons on the notification itself, so a check-in costs one tap. */
export async function registerCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(HABIT_CATEGORY, [
    {
      identifier: ACTION_CHECK_IN,
      buttonTitle: 'Check in',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_HEADING_OUT,
      buttonTitle: 'Heading out now',
      options: { opensAppToForeground: false },
    },
  ]);
}

function projectId(): string | undefined {
  const fromEas = Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined;
  return fromEas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Ask for permission, get the Expo push token, and store it on the profile.
 * Safe to call on every launch: the token is stable and the write is an update.
 */
export async function registerForPush(userId: string): Promise<PushRegistration> {
  // First, and outside everything that can fail.
  //
  // This used to sit after the token fetch, inside its try, so a thrown fetch
  // meant the two buttons were never registered and every notification landed
  // bare — the one part of this the App Store description promises by name.
  // It is only telling the OS what the buttons are, it needs no permission and
  // no network, and doing it on a simulator too is what makes the buttons
  // testable with `xcrun simctl push`.
  await registerCategories();

  // Permission is asked for before the device check, not after it.
  //
  // A simulator can display a notification perfectly well — `xcrun simctl
  // push` puts one on the screen — but only if the app has been granted
  // permission, and the only request lived past this return. So the two quick
  // actions could not be seen anywhere without a real phone and a habit that
  // happened to be due in the next ten minutes, which is why they reached the
  // App Store named in the description and never once looked at.
  //
  // On a real device nothing changes: the check below passes either way.
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') return { ok: false, reason: 'denied' };

  if (!Device.isDevice) return { ok: false, reason: 'simulator' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders and nudges',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const id = projectId();
  if (!id) return { ok: false, reason: 'no-project-id' };

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId: id });
    // The write is checked, because "Reminders and nudges are on for this
    // phone" was shown on the strength of the token alone. A token nothing can
    // read is not reminders being on, and saying so hides the failure on the
    // one screen somebody would look at to find it.
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token.data })
      .eq('id', userId);
    if (error) return { ok: false, reason: 'failed' };
    return { ok: true, token: token.data };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** Stop the pushes without signing out. */
export async function unregisterPush(userId: string): Promise<void> {
  await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
}

type ActionPayload = {
  habitId?: string;
  crewId?: string;
  nudgeId?: string;
  kind?: string;
};

/**
 * Handle a quick action. Both of these are meant to work without opening the
 * app, so they write straight to the database rather than navigating.
 */
export async function handleNotificationAction(
  actionIdentifier: string,
  data: ActionPayload,
  userId: string,
  localDate: string,
): Promise<void> {
  if (actionIdentifier === ACTION_CHECK_IN && data.habitId) {
    await supabase.from('checkins').upsert(
      { habit_id: data.habitId, user_id: userId, local_date: localDate },
      { onConflict: 'habit_id,user_id,local_date', ignoreDuplicates: true },
    );
    return;
  }

  if (actionIdentifier === ACTION_HEADING_OUT && data.crewId) {
    await supabase
      .from('status_events')
      .insert({ crew_id: data.crewId, user_id: userId, kind: 'heading_out' });
  }
}
