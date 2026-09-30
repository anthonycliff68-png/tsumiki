import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton } from '@/components/Button';
import { FacePicker } from '@/components/FacePicker';
import { Field } from '@/components/Field';
import { ArrowRightIcon } from '@/components/icons';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { useAnchors, useMyProfile, useUpdateProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { faceOf } from '@/lib/models';
import { display, fonts, habitColors, spacing, type Palette } from '@/theme';
import { Display } from '@/components/Screen';

/** How big the preview disc is. Large enough that an emoji reads as a choice. */
const PREVIEW = 96;

/**
 * Step 1. Name, face and colour.
 *
 * This step exists because display_name used to be written exactly once, from
 * Apple's given name — so anyone who signed in by email never had one, and
 * showed up in their crew as a blank tile. Nothing here can be skipped: a name
 * is the one thing other people see.
 */
export default function ProfileScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: profile } = useMyProfile(userId);
  const { data: anchors } = useAnchors(userId);
  const update = useUpdateProfile(userId);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [colour, setColour] = useState<string>(habitColors[0]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Seed from the row once and only once. Sign in with Apple has already
   * written a name by the time this screen opens, and it would be rude to ask
   * for something we were just told — but re-seeding on every fetch would
   * overwrite whatever is being typed.
   */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !profile) return;
    seeded.current = true;
    setName(profile.display_name);
    setEmoji(profile.avatar_emoji);
    if (profile.avatar_color) setColour(profile.avatar_color);
  }, [profile]);

  const trimmed = name.trim();

  const save = async () => {
    if (!trimmed) {
      setError(copy.onboarding.profile.nameMissing);
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({
        displayName: trimmed,
        avatarColor: colour,
        avatarEmoji: emoji,
      });
      // Most people arriving here are new and go on to set their routine up.
      // Some are not: this step also catches accounts made before it existed,
      // and those already have a routine. Sending them to step 2 would show
      // them the default anchors and insert a second set on top of their own.
      if (anchors && anchors.length > 0) router.replace('/');
      else router.push('/routine');
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.onboarding.profile.failed);
    }
  };

  return (
    <View style={styles.root}>
      {/* The bleed follows the colour being picked, so the choice is felt
          before it is confirmed. */}
      <Bleed color={colour} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: 120,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* No back: behind this is the sign-in screen. No skip either — a
            nameless member is the bug this screen was added to fix. */}
        <OnboardingHeader step={1} />

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{copy.onboarding.profile.eyebrow}</Text>
          <Display size={48} line={42}>{copy.onboarding.profile.title}</Display>
          <Text style={styles.blurb}>{copy.onboarding.profile.blurb}</Text>
        </View>

        <View style={styles.previewRow}>
          <View
            style={[styles.preview, { backgroundColor: colour }]}
            accessible
            accessibilityLabel={copy.onboarding.profile.faceLabel}
          >
            <Text style={[styles.previewFace, emoji ? styles.previewEmoji : null]}>
              {faceOf(trimmed, emoji)}
            </Text>
          </View>
        </View>

        <Field
          label={copy.onboarding.profile.nameLabel}
          placeholder={copy.onboarding.profile.namePlaceholder}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (error) setError(null);
          }}
          autoFocus
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="done"
          maxLength={40}
          editable={!update.isPending}
        />

        <FacePicker emoji={emoji} onEmoji={setEmoji} colour={colour} onColour={setColour} />

        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <PrimaryButton
          label={update.isPending ? copy.onboarding.profile.saving : copy.onboarding.profile.next}
          busy={update.isPending}
          onPress={() => void save()}
          icon={<ArrowRightIcon size={20} color={colors.bg} />}
        />
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  intro: { gap: spacing.sm },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  blurb: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
  },
  previewRow: { alignItems: 'center' },
  preview: {
    width: PREVIEW,
    height: PREVIEW,
    borderRadius: PREVIEW / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  previewFace: {
    ...display(34, 34),
    color: colors.white,
  },
  // An emoji is a glyph, not type: the display face would letter-space it.
  previewEmoji: {
    fontFamily: undefined,
    fontSize: 44,
    letterSpacing: 0,
  },
  footer: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 0,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
    color: habitColors[1],
  },
}) as const;
