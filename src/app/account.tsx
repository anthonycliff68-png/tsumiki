import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/Button';
import { Field } from '@/components/Field';
import { Body, Screen, Title } from '@/components/Screen';
import { ToggleRow } from '@/components/ToggleRow';
import { copy } from '@/copy';
import { useMyProfile, useProductEmailOptIn } from '@/lib/api';
import { useStyles } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { goBack } from '@/lib/back';
import { messageFrom } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { fonts, habitColors, spacing, type Palette } from '@/theme';

/** Supabase accepts six. Eight is the shortest that is worth calling a
 *  password, and the field says so before anyone finds out by being refused. */
const MIN_PASSWORD = 8;

export default function AccountScreen() {
  const styles = useStyles(makeStyles);
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: profile } = useMyProfile(userId);
  const optIn = useProductEmailOptIn(userId);

  const [email, setEmail] = useState('');
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const [password, setPassword] = useState('');
  const [passwordNote, setPasswordNote] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const currentEmail = session?.user.email ?? '';

  /**
   * Whether to say "set" or "change". Somebody who came in through Apple has
   * no password at all, and telling them to change one they never had is how
   * a person decides the app is broken. A code sign-in is indistinguishable
   * from a password one here, so this errs towards "change".
   */
  const providers = session?.user.app_metadata?.providers;
  const hasPassword = Array.isArray(providers) ? providers.includes('email') : true;

  const changeEmail = async () => {
    const next = email.trim().toLowerCase();
    setEmailError(null);
    setEmailNote(null);
    if (!next || !next.includes('@')) {
      setEmailError(copy.account.badEmail);
      return;
    }
    setEmailBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: next });
      if (error) throw error;
      // Nothing has changed yet, and saying otherwise would leave somebody
      // locked out: Supabase keeps the old address working until the new one
      // is confirmed.
      setEmailNote(copy.account.emailSent(next));
      setEmail('');
    } catch (e) {
      setEmailError(messageFrom(e, copy.account.emailFailed));
    } finally {
      setEmailBusy(false);
    }
  };

  const changePassword = async () => {
    setPasswordError(null);
    setPasswordNote(null);
    if (password.length < MIN_PASSWORD) {
      setPasswordError(copy.account.passwordTooShort);
      return;
    }
    setPasswordBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPasswordNote(copy.account.passwordSaved);
      setPassword('');
    } catch (e) {
      setPasswordError(messageFrom(e, copy.account.passwordFailed));
    } finally {
      setPasswordBusy(false);
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
            <Title size={46}>{copy.account.title}</Title>
            <Body>{copy.account.emailCurrent(currentEmail)}</Body>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{copy.account.changeEmail}</Text>
            <Field
              label={copy.account.newEmail}
              placeholder={copy.auth.emailPlaceholder}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!emailBusy}
            />
            {emailNote !== null && (
              <Text style={styles.note} accessibilityLiveRegion="polite">
                {emailNote}
              </Text>
            )}
            {emailError !== null && (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {emailError}
              </Text>
            )}
            <PrimaryButton
              label={emailBusy ? copy.feedback.sending : copy.account.changeEmail}
              busy={emailBusy}
              onPress={() => void changeEmail()}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              {hasPassword ? copy.account.changePassword : copy.account.setPassword}
            </Text>
            <Text style={styles.meta}>
              {hasPassword ? copy.account.passwordHintSome : copy.account.passwordHintNone}
            </Text>
            <Field
              label={copy.account.newPassword}
              placeholder={copy.account.newPasswordPlaceholder}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType="newPassword"
              editable={!passwordBusy}
            />
            {passwordNote !== null && (
              <Text style={styles.note} accessibilityLiveRegion="polite">
                {passwordNote}
              </Text>
            )}
            {passwordError !== null && (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {passwordError}
              </Text>
            )}
            <PrimaryButton
              label={
                passwordBusy
                  ? copy.feedback.sending
                  : hasPassword
                    ? copy.account.changePassword
                    : copy.account.setPassword
              }
              busy={passwordBusy}
              onPress={() => void changePassword()}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{copy.account.productEmail}</Text>
            <ToggleRow
              label={copy.account.productEmailToggle}
              hint={copy.account.productEmailHint}
              value={profile?.product_email_opt_in ?? false}
              onValueChange={(next) => optIn.mutate(next)}
              disabled={optIn.isPending || !profile}
            />
            {/* Kept separate from the hint on purpose. Somebody turning the
                switch off still gets their sign-in code, and not saying so
                reads as a trick the first time one arrives. */}
            <Text style={styles.meta}>{copy.account.productEmailAlways}</Text>
          </View>

          <TextButton label={copy.newHabit.cancel} onPress={() => goBack()} />
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => ({
  fill: { flex: 1 },
  body: { gap: spacing.lg, paddingBottom: spacing.xxl },
  head: { gap: spacing.md, paddingTop: spacing.xl },
  section: { gap: spacing.sm },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  meta: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textFaint },
  note: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: colors.success },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: habitColors[1] },
}) as const;
