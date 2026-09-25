import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { Field } from '@/components/Field';
import { Body, Screen, Stub } from '@/components/Screen';
import { CardCollage } from '@/components/CardCollage';
import { APP_NAME } from '@/constants/brand';
import { useStyles } from '@/lib/appearance';
import { copy } from '@/copy';
import { useAuth } from '@/lib/auth';
import { CODE_MAX, longEnough, normaliseCode, readCodeError } from '@/lib/otp.ts';
import { isSupabaseConfigured } from '@/lib/supabase';
import { alpha, display, fonts, habitColors, spacing, type Palette } from '@/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sayWhy(message: string): string {
  const problem = readCodeError(message);
  if (problem === 'expired') return copy.auth.codeExpired;
  if (problem === 'wrong') return copy.auth.codeWrong;
  return message;
}

export default function SignInScreen() {
  const styles = useStyles(makeStyles);
  const { signInWithEmail, verifyEmailCode, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);
    try {
      await signInWithEmail(trimmed);
      setSentTo(trimmed);
      setCode('');
    } catch (e) {
      // Supabase throttles resends; its message says how long to wait, which
      // is more use than anything generic.
      setError(e instanceof Error ? e.message : copy.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithEmail(sentTo);
      setCode('');
      setNotice(copy.auth.resent);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (value: string) => {
    if (!sentTo) return;
    if (!longEnough(value)) {
      setError(copy.auth.codeTooShort);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await verifyEmailCode(sentTo, value);
      // The provider picks the session up; the router moves us on.
    } catch (e) {
      setError(e instanceof Error ? sayWhy(e.message) : copy.auth.genericError);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Digits only. It used to sign in by itself the moment a sixth digit landed,
   * which is lovely for a six-digit code and breaks an eight-digit one: it
   * submits two digits early, every time. Since the real length is a server
   * setting, there is nothing safe to count to — so the code goes when it is
   * sent, by the keyboard's go key or the button.
   */
  const onCodeChange = (raw: string) => {
    setCode(normaliseCode(raw));
    if (error) setError(null);
  };

  const signInApple = async () => {
    setError(null);
    try {
      await signInWithApple();
    } catch (e) {
      // The sheet being dismissed is not an error worth showing.
      if (e instanceof Error && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') return;
      // Everything else Apple raises is a Swift exception whose message names a
      // file and a line number. That is for us, not for whoever is holding the
      // phone — and it is what a reviewer sees on a device with no Apple
      // account signed in. Say something true and useful instead, and leave
      // the original in the log.
      console.warn('Sign in with Apple failed', e);
      setError(copy.auth.appleFailed);
    }
  };

  return (
    <Screen color={habitColors[1]} underDock={false}>
      <CardCollage height={470} fadeFrom={150} />
      <View style={styles.header}>
        <Text style={[display(66, 58), styles.word]}>{APP_NAME.toUpperCase()}</Text>
        <Text style={styles.tagline}>{copy.auth.tagline}</Text>
      </View>

      {!isSupabaseConfigured ? (
        <Stub>{copy.auth.notConfigured}</Stub>
      ) : sentTo ? (
        <View style={styles.form}>
          <Body>{copy.auth.codeSent(sentTo)}</Body>

          <Field
            label={copy.auth.codeLabel}
            placeholder={copy.auth.codePlaceholder}
            value={code}
            onChangeText={onCodeChange}
            autoFocus
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            inputMode="numeric"
            keyboardType="number-pad"
            returnKeyType="go"
            maxLength={CODE_MAX}
            onSubmitEditing={() => void submitCode(code)}
            editable={!busy}
            style={styles.code}
          />

          <PrimaryButton
            label={busy ? copy.auth.verifying : copy.auth.verify}
            onPress={() => void submitCode(code)}
            busy={busy}
          />

          <Text style={styles.hint}>{copy.auth.linkAlsoWorks}</Text>

          <TextButton label={copy.auth.resend} onPress={resend} />
          <TextButton
            label={copy.auth.useAnotherEmail}
            onPress={() => {
              setSentTo(null);
              setEmail('');
              setCode('');
              setError(null);
              setNotice(null);
            }}
          />
        </View>
      ) : (
        <View style={styles.form}>
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={999}
              style={styles.apple}
              onPress={signInApple}
            />
          )}

          {/* Only an alternative when there is something to be an
              alternative to: Apple sign-in does not exist in Expo Go, and
              a lone "or use your email" reads as a bug. */}
          {appleAvailable && (
            <View style={styles.rule}>
              <View style={styles.ruleLine} />
              <Text style={styles.ruleLabel}>{copy.auth.orEmail}</Text>
              <View style={styles.ruleLine} />
            </View>
          )}

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
        </View>
      )}

      {notice && !error && (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          {notice}
        </Text>
      )}

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </Screen>
  );
}

const makeStyles = (colors: Palette) => ({
  header: {
    gap: spacing.sm,
    paddingTop: 330,
    alignItems: 'center',
  },
  word: { color: colors.text, textAlign: 'center' },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ruleLine: { flex: 1, height: 1, backgroundColor: alpha(colors.overlay, 0.14) },
  ruleLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  form: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  code: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    letterSpacing: 10,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textFaint,
    textAlign: 'center',
  },
  notice: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
    paddingTop: spacing.md,
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
}) as const;
