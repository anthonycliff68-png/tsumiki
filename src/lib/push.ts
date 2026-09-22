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
  if (!Device.isDevice) return { ok: false, reason: 'simulator' };

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') return { ok: false, reason: 'denied' };

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
    await registerCategories();
    await supabase.from('profiles').update({ push_token: token.data }).eq('id', userId);
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
