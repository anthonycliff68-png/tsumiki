import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { Field } from '@/components/Field';
import { Body, Screen, Title } from '@/components/Screen';
import { copy } from '@/copy';
import { useStyles } from '@/lib/appearance';
import { goBack } from '@/lib/back';
import { messageFrom } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { fonts, habitColors, spacing, type Palette } from '@/theme';

const MIN_PASSWORD = 8;

/**
 * Forgotten password, in two steps on one screen.
 *
 * A code rather than a link, to match how signing in already works here. A
 * recovery link has to come back into the app through a deep link, and a link
 * that opens the wrong place — a browser, the App Store, nothing at all — is a
 * person locked out of their own account with no second route.
 *
 * The code path reuses machinery that is already proven in this app.
 */
export default function ResetPasswordScreen() {
  const styles = useStyles(makeStyles);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    const address = email.trim().toLowerCase();
    setError(null);
    if (!address.includes('@')) {
      setError(copy.account.badEmail);
      return;
    }
    setBusy(true);
    try {
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(address);
      // Deliberately not surfaced. Supabase reports whether the address is
      // known, and repeating that turns this screen into a way to ask which
      // emails have accounts here.
      if (sendError) console.warn('reset email', sendError.message);
      setCodeSent(true);
      setNote(copy.reset.sent(address));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(copy.account.passwordTooShort);
      return;
    }
    setBusy(true);
    try {
      // The code is exchanged for a session first; without one there is
      // nothing to attach a new password to.
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: 'recovery',
      });
      if (otpError) throw otpError;

      const { error: saveError } = await supabase.auth.updateUser({ password });
      if (saveError) throw saveError;

      // Already signed in by the exchange above, so there is nowhere to send
      // them but in.
      router.replace('/');
    } catch (e) {
      setError(messageFrom(e, copy.reset.failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen color={habitColors[0]} underDock={false}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.head}>
            <Title size={46}>{copy.reset.title}</Title>
            <Body>{copy.reset.blurb}</Body>
          </View>

          <Field
            label={copy.reset.emailLabel}
            placeholder={copy.auth.emailPlaceholder}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!busy && !codeSent}
          />

          {note !== null && (
            <Text style={styles.note} accessibilityLiveRegion="polite">
              {note}
            </Text>
          )}

          {codeSent && (
            <>
              <Field
                label={copy.reset.codeLabel}
                placeholder={copy.reset.codePlaceholder}
                value={code}
                onChangeText={(text) => {
                  setCode(text);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                editable={!busy}
              />
              <Field
                label={copy.reset.newPassword}
                placeholder={copy.reset.newPasswordPlaceholder}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                textContentType="newPassword"
                editable={!busy}
              />
            </>
          )}

          {error !== null && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <PrimaryButton
            label={
              busy
                ? codeSent
                  ? copy.reset.saving
                  : copy.reset.sending
                : codeSent
                  ? copy.reset.save
                  : copy.reset.send
            }
            busy={busy}
            onPress={() => void (codeSent ? save() : sendCode())}
          />
          <TextButton label={copy.reset.back} onPress={() => goBack()} />
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => ({
  fill: { flex: 1 },
  body: { gap: spacing.md, paddingBottom: spacing.xxl },
  head: { gap: spacing.md, paddingTop: spacing.xl },
  note: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: colors.success },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: habitColors[1] },
}) as const;
