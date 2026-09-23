import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Screen, Stub, Title } from '@/components/Screen';
import { TextButton } from '@/components/Button';
import { APP_NAME, APP_TAGLINE, TERMS_URL } from '@/constants/brand';
import { copy } from '@/copy';
import { useBlocked, useDeleteAccount, useMyProfile, useUnblockUser } from '@/lib/api';
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
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();
  const { data: blocked = [] } = useBlocked(userId);
  const unblock = useUnblockUser(userId);

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

      <Text style={styles.label}>{copy.safety.blockedTitle}</Text>
      {blocked.length === 0 ? (
        <Text style={styles.meta}>{copy.safety.blockedEmpty}</Text>
      ) : (
        blocked.map((person) => (
          <View key={person.userId} style={styles.blockedRow}>
            <View style={[styles.blockedDot, { backgroundColor: person.avatarColor }]} />
            <Text style={styles.blockedName} numberOfLines={1}>
              {person.displayName}
            </Text>
            <Text
              accessibilityRole="button"
              onPress={() => unblock.mutate(person.userId)}
              style={styles.unblock}
            >
              {copy.safety.unblock}
            </Text>
          </View>
        ))
      )}

      <Text
        accessibilityRole="link"
        onPress={() => void Linking.openURL(TERMS_URL)}
        style={styles.termsLink}
      >
        {copy.safety.terms}
      </Text>

      <Stub>{copy.placeholder.you}</Stub>

      <View style={{ paddingTop: spacing.md }}>
        <TextButton label={copy.auth.signOut} onPress={() => void signOut()} />
      </View>

      {confirming ? (
        <View style={styles.danger}>
          <Text style={styles.dangerTitle}>{copy.auth.deleteTitle}</Text>
          <Text style={styles.dangerBody}>{copy.auth.deleteBody}</Text>
          <Text style={styles.dangerBody}>{copy.auth.deleteCrews}</Text>
          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.auth.deleteConfirm}
            disabled={deleteAccount.isPending}
            onPress={() =>
              deleteAccount.mutate(undefined, {
                // The account is gone; drop the session so the app returns to
                // sign-in rather than holding a token for a user that no
                // longer exists.
                onSuccess: () => void signOut(),
                onError: () => setError(copy.auth.deleteFailed),
              })
            }
            style={({ pressed }) => [styles.dangerButton, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.dangerButtonText}>{copy.auth.deleteConfirm}</Text>
          </Pressable>

          <TextButton label={copy.auth.cancel} onPress={() => setConfirming(false)} />
        </View>
      ) : (
        <TextButton label={copy.auth.deleteAction} onPress={() => setConfirming(true)} />
      )}
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
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
  },
  blockedDot: { width: 10, height: 10, borderRadius: 5 },
  blockedName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  unblock: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted },
  termsLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textMuted,
    paddingTop: spacing.md,
  },
  danger: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  dangerBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.textMuted },
  dangerButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: habitColors[1],
  },
  dangerButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: habitColors[4] },
});
