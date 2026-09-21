import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { Field } from '@/components/Field';
import { Body, Screen, Stub, Title } from '@/components/Screen';
import { copy } from '@/copy';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors, fonts, habitColors, spacing } from '@/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const { signInWithEmail, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const sendLink = async () => {
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError(copy.auth.invalidEmail);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(trimmed);
      setSentTo(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const signInApple = async () => {
    setError(null);
    try {
      await signInWithApple();
    } catch (e) {
      // The sheet being dismissed is not an error worth showing.
      if (e instanceof Error && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') return;
      setError(e instanceof Error ? e.message : copy.auth.genericError);
    }
  };

  return (
    <Screen color={habitColors[1]} underDock={false}>
      <View style={styles.header}>
        <Title size={58}>{copy.auth.title}</Title>
        <Body>{copy.auth.blurb}</Body>
      </View>

      {!isSupabaseConfigured ? (
        <Stub>{copy.auth.notConfigured}</Stub>
      ) : sentTo ? (
        <View style={styles.form}>
          <Body>{copy.auth.linkSent(sentTo)}</Body>
          <TextButton
            label={copy.auth.useAnotherEmail}
            onPress={() => {
              setSentTo(null);
              setEmail('');
            }}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <Field
            label={copy.auth.emailLabel}
            placeholder={copy.auth.emailPlaceholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            inputMode="email"
            keyboardType="email-address"
            returnKeyType="go"
            onSubmitEditing={sendLink}
            editable={!busy}
          />
          <PrimaryButton
            label={busy ? copy.auth.sending : copy.auth.sendLink}
            onPress={sendLink}
            busy={busy}
          />

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={999}
              style={styles.apple}
              onPress={signInApple}
            />
          )}
        </View>
      )}

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    paddingTop: spacing.xxl,
  },
  form: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  apple: {
    height: 58,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
    color: '#E8552B',
  },
});
