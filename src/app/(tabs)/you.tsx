import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { TextButton } from '@/components/Button';
import { ProfileCard } from '@/components/ProfileCard';
import { Screen, Title } from '@/components/Screen';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { PRIVACY_URL, TERMS_URL } from '@/constants/brand';
import { copy } from '@/copy';
import { useBlocked, useDeleteAccount, useMyProfile } from '@/lib/api';
import { useAppearance, useStyles } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { registerForPush, type PushRegistration } from '@/lib/push';
import { fonts, habitColors, spacing, type Palette } from '@/theme';

const THEME_LABEL = {
  light: copy.you.themeLight,
  dark: copy.you.themeDark,
  system: copy.you.themeSystem,
} as const;

/**
 * You.
 *
 * Who you are, then a way to everything else.
 *
 * This used to be one scroll carrying eight unrelated settings with their whole
 * interfaces open at once — theme chips, four lines of push status, the blocked
 * list, and a delete confirmation that expanded in place. Nothing was findable
 * because everything was visible. Each setting now says only what it is and
 * what it is set to, and lives on its own screen where there is room to explain
 * itself.
 */
export default function YouScreen() {
  const { choice } = useAppearance();
  const styles = useStyles(makeStyles);
  const { session, signOut } = useAuth();
  const userId = session?.user.id;
  const { data: profile } = useMyProfile(userId);
  const { data: blocked = [] } = useBlocked(userId);
  const [push, setPush] = useState<PushRegistration | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();

  const isExpoGo = Constants.appOwnership === 'expo';

  // Read here only to summarise it on the row. The screen it leads to does the
  // same work again, which is cheap and keeps that screen able to stand alone.
  useEffect(() => {
    if (!userId || isExpoGo) return;
    void registerForPush(userId).then(setPush);
  }, [userId, isExpoGo]);

  const pushValue = isExpoGo
    ? copy.you.rowOff
    : !push
      ? undefined
      : push.ok
        ? copy.you.rowOn
        : copy.you.rowOff;

  return (
    <Screen color={habitColors[3]}>
      <Title size={64}>{copy.you.profile}</Title>

      <ProfileCard userId={userId} />

      {/* Who you are to other people, and how you get back in. */}
      <Text style={styles.label}>{copy.you.groupAccount}</Text>
      <SettingsGroup>
        <SettingsRow
          label={copy.account.title}
          value={session?.user.email ?? undefined}
          onPress={() => router.push('/account')}
        />
        <SettingsRow
          label={copy.you.notifications}
          value={pushValue}
          onPress={() => router.push('/notifications')}
        />
        <SettingsRow
          label={copy.you.appearance}
          value={THEME_LABEL[choice]}
          onPress={() => router.push('/appearance')}
        />
      </SettingsGroup>

      <Text style={styles.label}>{copy.you.groupApp}</Text>
      <SettingsGroup>
        <SettingsRow
          label={copy.you.subscription}
          value={profile?.subscribed_until ? copy.you.rowOn : undefined}
          onPress={() => router.push('/plans')}
        />
        <SettingsRow
          label={copy.account.sendFeedback}
          onPress={() => router.push('/feedback')}
        />
        <SettingsRow
          label={copy.safety.blockedTitle}
          value={blocked.length > 0 ? String(blocked.length) : undefined}
          onPress={() => router.push('/blocked')}
        />
      </SettingsGroup>

      <Text style={styles.label}>{copy.you.groupLegal}</Text>
      <SettingsGroup>
        <SettingsRow label={copy.you.terms} onPress={() => void Linking.openURL(TERMS_URL)} />
        <SettingsRow label={copy.you.privacy} onPress={() => void Linking.openURL(PRIVACY_URL)} />
      </SettingsGroup>

      {/* Leaving, in both senses. Kept apart from everything above, and last,
          because neither of these is a setting. */}
      <View style={styles.leaving}>
        <TextButton label={copy.auth.signOut} onPress={() => void signOut()} />

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
      </View>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => ({
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
    paddingTop: spacing.md,
  },
  leaving: { gap: spacing.sm, paddingTop: spacing.xl },
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
}) as const;
