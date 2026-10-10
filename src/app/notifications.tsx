import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CompactButton } from '@/components/Button';
import { Display, Screen } from '@/components/Screen';
import { copy } from '@/copy';
import { formatTime } from '@/data/defaults';
import { useMyProfile } from '@/lib/api';
import { useStyles } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { goBack } from '@/lib/back';
import { registerForPush, unregisterPush, type PushRegistration } from '@/lib/push';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

/** Notifications, with room to say what is actually happening. On the You tab
 *  this was four lines of status wedged between a theme picker and a billing
 *  link, which is where nobody reads it. */
export default function NotificationsScreen() {
  const styles = useStyles(makeStyles);
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: profile, refetch } = useMyProfile(userId);
  const [push, setPush] = useState<PushRegistration | null>(null);

  const isExpoGo = Constants.appOwnership === 'expo';

  useEffect(() => {
    if (!userId || isExpoGo) return;
    void registerForPush(userId).then(setPush);
  }, [userId, isExpoGo]);

  const pushLine = isExpoGo
    ? copy.you.expoGo
    : !push
      ? null
      : push.ok
        ? copy.you.on
        : push.reason === 'simulator'
          ? copy.you.simulator
          : push.reason === 'denied'
            ? copy.you.denied
            : push.reason === 'no-project-id'
              ? copy.you.noProjectId
              : copy.you.failed;

  return (
    <Screen color={habitColors[2]} underDock={false}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" onPress={() => goBack()} style={styles.pill}>
            <Text style={styles.pillText}>{copy.newHabit.cancel}</Text>
          </Pressable>
        </View>

        <Display size={52} line={46}>{copy.you.notifications}</Display>

        <View style={styles.card}>
          <Text style={styles.label}>{copy.notifications.statusLabel}</Text>
          {pushLine && <Text style={styles.status}>{pushLine}</Text>}
          {push?.ok && userId && (
            <CompactButton
              label={copy.you.turnOff}
              onPress={() => {
                void unregisterPush(userId).then(() => {
                  setPush(null);
                  void refetch();
                });
              }}
            />
          )}
        </View>

        {profile && (
          <View style={styles.card}>
            <Text style={styles.label}>{copy.notifications.quietLabel}</Text>
            <Text style={styles.status}>
              {copy.you.quietHours(formatTime(profile.quiet_start), formatTime(profile.quiet_end))}
            </Text>
            <Text style={styles.meta}>{copy.notifications.quietHint}</Text>
            <Text style={styles.meta}>{copy.you.timezone(profile.timezone)}</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => ({
  body: { gap: spacing.md, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', paddingBottom: spacing.sm },
  pill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.06),
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: alpha(colors.overlay, 0.04),
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  status: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textFaint },
}) as const;
