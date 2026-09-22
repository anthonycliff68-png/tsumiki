import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Screen, Stub, Title } from '@/components/Screen';
import { TextButton } from '@/components/Button';
import { APP_NAME, APP_TAGLINE } from '@/constants/brand';
import { copy } from '@/copy';
import { useMyProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatTime } from '@/data/defaults';
import { registerForPush, unregisterPush, type PushRegistration } from '@/lib/push';
import { colors, fonts, habitColors, spacing } from '@/theme';

/** You. Artboard: none yet — settings follow the same tokens as everything else. */
export default function YouScreen() {
  const { session, signOut } = useAuth();
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
    <Screen color={habitColors[3]}>
      <Title size={64}>You</Title>
      <Body>
        {APP_NAME} — {APP_TAGLINE}
      </Body>
      {session?.user.email && <Body>Signed in as {session.user.email}</Body>}

      <Text style={styles.label}>{copy.you.notifications}</Text>
      {pushLine && <Body>{pushLine}</Body>}
      {profile && (
        <>
          <Text style={styles.meta}>
            {copy.you.quietHours(formatTime(profile.quiet_start), formatTime(profile.quiet_end))}
          </Text>
          <Text style={styles.meta}>{copy.you.timezone(profile.timezone)}</Text>
        </>
      )}
      {push?.ok && userId && (
        <TextButton
          label={copy.you.turnOff}
          onPress={() => {
            void unregisterPush(userId).then(() => {
              setPush(null);
              void refetch();
            });
          }}
        />
      )}

      <Stub>{copy.placeholder.you}</Stub>

      <View style={{ paddingTop: spacing.md }}>
        <TextButton label={copy.auth.signOut} onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
    paddingTop: spacing.md,
  },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
});
