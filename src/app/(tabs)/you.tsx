import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { TextButton } from '@/components/Button';
import { ProfileCard } from '@/components/ProfileCard';
import { Reveal } from '@/components/Reveal';
import { Screen, Title } from '@/components/Screen';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { PRIVACY_URL, TERMS_URL } from '@/constants/brand';
import { copy } from '@/copy';
import { useBlocked, useDeleteAccount, useHabitHistory, useMyProfile } from '@/lib/api';
import { useStyles } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { localDateString } from '@/lib/dates';
import { isDue, shiftDate } from '@/lib/stats';
import { registerForPush, type PushRegistration } from '@/lib/push';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

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
  const styles = useStyles(makeStyles);
  const { session, signOut } = useAuth();
  const userId = session?.user.id;
  const { data: profile } = useMyProfile(userId);
  const { data: blocked = [] } = useBlocked(userId);
  const [push, setPush] = useState<PushRegistration | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();
  const { data: history = [] } = useHabitHistory(userId);

  // Done over due across the thirty days before today, which are finished.
  const today = localDateString(new Date());
  let due = 0;
  let done = 0;
  for (let d = shiftDate(today, -30); d < today; d = shiftDate(d, 1)) {
    for (const h of history) {
      if (!isDue(h, d, today)) continue;
      due += 1;
      if (h.checkedOn.includes(d)) done += 1;
    }
  }
  const rate = due ? Math.round((done / due) * 100) : null;

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
      <BrandHeader />

      <Title size={64}>{copy.you.profile}</Title>

      <Reveal index={0}>
        <ProfileCard userId={userId} />
      </Reveal>

      {/* Who you are to other people, and how you get back in. Each group
          arrives just behind the one above, which gives the eye an order to
          read them in — the reason they were grouped at all. */}
      {/* Progress lives behind this now that it is not a tab of its own. */}
      <Reveal index={1}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/progress')}
          style={({ pressed }) => [styles.progress, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.label}>{copy.you.progressTitle}</Text>
          <Text style={styles.progressRate}>
            {rate === null ? copy.you.noStatsYet : copy.you.progressRate(rate)}
          </Text>
          <Text style={styles.progressLink}>{copy.you.seeProgress}</Text>
        </Pressable>
      </Reveal>

      <Reveal index={1} style={styles.group}>
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
        </SettingsGroup>
      </Reveal>

      <Reveal index={2} style={styles.group}>
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
        {/* Only once there is somebody on it. Apple requires a way to block
            abusive people in an app with names and messages in it, so the
            capability stays — blocking happens from a crew or a nudge, and
            this is the only way back from it. But an empty list does not need
            a permanent slot on the profile, which is virtually everyone. */}
        {blocked.length > 0 && (
          <SettingsRow
            label={copy.safety.blockedTitle}
            value={String(blocked.length)}
            onPress={() => router.push('/blocked')}
          />
        )}
        </SettingsGroup>
      </Reveal>

      <Reveal index={3} style={styles.group}>
        <Text style={styles.label}>{copy.you.groupLegal}</Text>
        <SettingsGroup>
          <SettingsRow label={copy.you.terms} onPress={() => void Linking.openURL(TERMS_URL)} />
          <SettingsRow label={copy.you.privacy} onPress={() => void Linking.openURL(PRIVACY_URL)} />
        </SettingsGroup>
      </Reveal>

      {/* Leaving, in both senses. Kept apart from everything above, and last,
          because neither of these is a setting. */}
      <Reveal index={4} style={styles.leaving}>
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
      </Reveal>
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
  },
  group: { gap: spacing.sm, paddingTop: spacing.md },
  progress: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: alpha(habitColors[2], 0.4),
    backgroundColor: alpha(habitColors[2], 0.14),
  },
  progressRate: { fontFamily: fonts.bodyMedium, fontSize: 22, color: colors.text },
  progressLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted },
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
