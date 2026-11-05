import * as AppleAuthentication from 'expo-apple-authentication';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandHeader';
import { PrimaryButton, TextButton } from '@/components/Button';
import { Field } from '@/components/Field';
import { Body, Stub } from '@/components/Screen';
import { PhotoBackdrop } from '@/components/WelcomePage';
import { useStyles } from '@/lib/appearance';
import { copy } from '@/copy';
import { useAuth } from '@/lib/auth';
import {
  CODE_MAX,
  longEnough,
  normaliseCode,
  readCodeError,
  readSendError,
  RESEND_COOLDOWN_SECONDS,
} from '@/lib/otp.ts';
import { isSupabaseConfigured } from '@/lib/supabase';
import { display, fonts, spacing, type Palette } from '@/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sayWhy(message: string): string {
  const problem = readCodeError(message);
  if (problem === 'expired') return copy.auth.codeExpired;
  if (problem === 'wrong') return copy.auth.codeWrong;
  return message;
}

export default function SignInScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { signInWithEmail, verifyEmailCode, signInWithApple, signInWithPassword } = useAuth();
  // Both are the same sign-in underneath: a new account is made on first use.
  // Only the words differ, so nobody has to know which one they are to get in.
  const { first } = useLocalSearchParams<{ first?: string }>();
  const [firstTime, setFirstTime] = useState(first === '1');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [password, setPassword] = useState('');
  const [withPassword, setWithPassword] = useState(false);
  const [emailChosen, setEmailChosen] = useState(false);
  /**
   * Seconds until another code may be asked for.
   *
   * The provider refuses two in quick succession, and refuses quietly enough
   * that a second tap can look exactly like a working one. Counting down in
   * the open is better than finding out by being ignored.
   */
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // Apple first, email one tap behind it. Without Apple, email is the only way in.
  const showEmail = emailChosen || !appleAvailable;

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
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      const problem = readSendError(e instanceof Error ? e.message : '');
      if (problem.kind === 'too-soon') {
        // Being refused a second code almost always means a first one is
        // already sitting in their inbox. Showing the error and nothing else
        // strands someone who has the thing they need — so go to the code
        // screen anyway and say why no new one is coming.
        setSentTo(trimmed);
        setCode('');
        setNotice(copy.auth.tooSoon(problem.seconds));
        setCooldown(problem.seconds);
      } else {
        setError(e instanceof Error ? e.message : copy.auth.genericError);
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!sentTo || cooldown > 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithEmail(sentTo);
      setCode('');
      setNotice(copy.auth.resent);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      const problem = readSendError(e instanceof Error ? e.message : '');
      if (problem.kind === 'too-soon') {
        // Not an error they caused, and the code they already have still
        // works — say that rather than showing them a failure.
        setNotice(copy.auth.tooSoon(problem.seconds));
        setCooldown(problem.seconds);
      } else {
        setError(e instanceof Error ? e.message : copy.auth.genericError);
      }
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

  const signInPassword = async () => {
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError(copy.auth.invalidEmail);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithPassword(trimmed, password);
      // The provider picks the session up; the router moves us on.
    } catch (e) {
      // Supabase says "Invalid login credentials", which is true and unhelpful.
      const message = e instanceof Error ? e.message : '';
      setError(/invalid login/i.test(message) ? copy.auth.wrongPassword : message || copy.auth.genericError);
      setPassword('');
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
    <View style={styles.root}>
      <PhotoBackdrop />
      <KeyboardAvoidingView behavior="padding" style={styles.avoid}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.page,
            { paddingTop: insets.top + spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
      <View style={styles.top}>
        {/* The headline already says the name. */}
        <BrandMark large markOnly />
        <Text style={[display(60, 56), styles.word]}>{firstTime ? copy.auth.headline : copy.auth.headlineBack}</Text>
      </View>

      <View>

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

          <TextButton
            label={cooldown > 0 ? copy.auth.resendIn(cooldown) : copy.auth.resend}
            onPress={resend}
            disabled={cooldown > 0 || busy}
          />
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
          {firstTime && <Text style={styles.question}>{copy.auth.firstTime}</Text>}
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              key={firstTime ? 'up' : 'in'}
              buttonType={
                firstTime
                  ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                  : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={999}
              style={styles.apple}
              onPress={signInApple}
            />
          )}

          {!showEmail && firstTime && (
            <TextButton label={copy.auth.useEmail} onPress={() => setEmailChosen(true)} />
          )}

          {/* Coming back: every way in is one tap, and nothing to type until one is picked. */}
          {!showEmail && !firstTime && (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => setEmailChosen(true)}
                style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
              >
                <Text style={styles.ghostLabel}>{copy.auth.emailMeCode}</Text>
              </Pressable>
              <TextButton
                label={copy.auth.useMyPassword}
                onPress={() => {
                  setWithPassword(true);
                  setEmailChosen(true);
                }}
              />
            </>
          )}

          {showEmail && (
            <>
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
            autoFocus={emailChosen}
          />
          {withPassword && !firstTime && (
            <Field
              label={copy.auth.passwordLabel}
              placeholder={copy.auth.passwordPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={signInPassword}
              editable={!busy}
            />
          )}

          <PrimaryButton
            label={
              withPassword && !firstTime
                ? busy
                  ? copy.auth.verifying
                  : copy.auth.signIn
                : busy
                  ? copy.auth.sending
                  : copy.auth.sendLink
            }
            onPress={withPassword && !firstTime ? signInPassword : sendLink}
            busy={busy}
          />

          {/* Quiet on purpose: no one is offered a password, and no one can
              make one here. It is a way in for an account that already has
              one. */}
          {!firstTime && (
            <TextButton
              label={withPassword ? copy.auth.useCode : copy.auth.usePassword}
              onPress={() => {
                setWithPassword(!withPassword);
                setPassword('');
                setError(null);
              }}
              disabled={busy}
            />
          )}

          {/* Only alongside the password field. Offering a reset to somebody
              who signs in with a code is offering to fix something they do
              not use, and the code they already asked for is the faster way
              in anyway. */}
          {withPassword && !firstTime && (
            <TextButton
              label={copy.auth.forgotPassword}
              onPress={() => router.push('/reset-password')}
              disabled={busy}
            />
          )}
            </>
          )}
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
      </View>

      {!sentTo && isSupabaseConfigured && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setFirstTime(!firstTime);
            setEmailChosen(false);
            setWithPassword(false);
            setPassword('');
            setError(null);
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.switch, pressed && styles.pressed]}
        >
          <Text style={styles.switchAsk}>
            {firstTime ? copy.auth.alreadyUser : copy.auth.firstTime}{' '}
            <Text style={styles.switchGo}>{firstTime ? copy.auth.signInHere : copy.auth.startHere}</Text>
          </Text>
        </Pressable>
      )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  avoid: { flex: 1 },
  page: { flexGrow: 1, gap: spacing.lg, paddingHorizontal: spacing.xl },
  top: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  word: { color: colors.text, textAlign: 'center' },
  question: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: colors.textMuted,
  },
  switch: { alignSelf: 'center', paddingVertical: spacing.sm },
  switchAsk: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  switchGo: { fontFamily: fonts.bodyBold, color: colors.text },
  pressed: { opacity: 0.75 },
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
  ghost: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: 'rgba(244,241,236,0.4)',
  },
  ghostLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
    color: '#E8552B',
  },
}) as const;
