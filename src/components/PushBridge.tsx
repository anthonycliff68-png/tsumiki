import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth';
import { localDateString } from '@/lib/dates';
import { handleNotificationAction, registerForPush } from '@/lib/push';

// How a push looks while the app is open: a banner, no badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registers for push once signed in, and turns an arriving notification into
 * either a check-in or a screen. Renders nothing.
 */
export function PushBridge() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    // A refused permission or a missing project id is not worth interrupting
    // anyone over; the You tab says what the state is.
    void registerForPush(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as {
        kind?: string;
        habitId?: string;
        crewId?: string;
        nudgeId?: string;
      };
      const action = response.actionIdentifier;

      // The two quick actions do their work without opening a screen.
      if (action !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        void handleNotificationAction(action, data, userId, localDateString()).then(() => {
          void queryClient.invalidateQueries({ queryKey: ['today'] });
          void queryClient.invalidateQueries({ queryKey: ['crew'] });
        });
        return;
      }

      // A plain tap opens whatever the push was about.
      if (data.kind === 'nudge' && data.nudgeId) {
        router.push({ pathname: '/nudge/[id]', params: { id: data.nudgeId } });
      } else if (data.kind === 'streak_saved' && data.crewId) {
        router.push({ pathname: '/crew/[id]', params: { id: data.crewId } });
      } else {
        router.push('/');
      }
    });

    return () => subscription.remove();
  }, [userId, queryClient]);

  return null;
}
