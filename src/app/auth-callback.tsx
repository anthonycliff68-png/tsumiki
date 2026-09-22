import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Bleed } from '@/components/Bleed';
import { copy } from '@/copy';
import { useAuth } from '@/lib/auth';
import { colors, fonts, habitColors, spacing } from '@/theme';

/**
 * Where the magic link lands. The session is exchanged by the provider; this
 * screen only has to wait for it, then get out of the way.
 */
export default function AuthCallbackScreen() {
  const { session, loading, exchanging, authError } = useAuth();

  if (session) return <Redirect href="/" />;
  if (!loading && !exchanging && authError) {
    return (
      <View style={styles.root}>
        <Bleed color={habitColors[1]} />
        <Text style={styles.error}>{authError}</Text>
        <Text style={styles.hint}>{copy.auth.linkExpired}</Text>
      </View>
    );
  }
  if (!loading && !exchanging) return <Redirect href="/sign-in" />;

  return (
    <View style={styles.root}>
      <Bleed color={habitColors[0]} />
      <ActivityIndicator color={colors.text} />
      <Text style={styles.hint}>{copy.auth.signingIn}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
