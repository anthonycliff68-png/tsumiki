import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { Body, Screen, Title } from '@/components/Screen';
import { copy } from '@/copy';
import { useDeleteAccount } from '@/lib/api';
import { useStyles } from '@/lib/appearance';
import { fonts, habitColors, spacing, type Palette } from '@/theme';

/**
 * Deleting an account, reachable from outside the tabs.
 *
 * It lives here rather than only inside You because You is behind the
 * paywall gate: someone whose week is up could otherwise see a "Delete my
 * account" button that led them straight back to the paywall. Apple requires
 * the path to work, and trapping someone who wants to leave would be wrong
 * even if it did not.
 */
export default function DeleteAccountRoute() {
  const styles = useStyles(makeStyles);
  const remove = useDeleteAccount();
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen color={habitColors[1]} underDock={false}>
      <View style={styles.head}>
        <Title size={46}>{copy.auth.deleteTitle}</Title>
        <Body>{copy.auth.deleteBody}</Body>
        <Body>{copy.auth.deleteCrews}</Body>
      </View>

      {error !== null && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      <PrimaryButton
        label={copy.auth.deleteConfirm}
        busy={remove.isPending}
        onPress={() =>
          remove.mutate(undefined, {
            onError: (e) => setError(e instanceof Error ? e.message : copy.auth.genericError),
          })
        }
      />
      <TextButton label={copy.newHabit.cancel} onPress={() => router.back()} />
    </Screen>
  );
}

const makeStyles = (colors: Palette) => ({
  head: { gap: spacing.md, paddingTop: spacing.xxl },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
}) as const;
