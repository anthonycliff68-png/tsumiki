import { Pressable, Text, View } from 'react-native';

import { useStyles } from '@/lib/appearance';
import { copy } from '@/copy';
import { PROFILE_EMOJI } from '@/data/defaults';
import { fonts, habitColors, radii, spacing, type Palette } from '@/theme';

type Props = {
  /** Empty means initials. */
  emoji: string;
  onEmoji: (emoji: string) => void;
  colour: string;
  onColour: (colour: string) => void;
};

/**
 * Pick a face and a colour.
 *
 * Shared by the onboarding step and the You screen, because they are choosing
 * the same two things and a second copy is a second set of labels to keep in
 * step. The preview disc is not part of it: onboarding shows a large one and
 * the You screen already has its own.
 */
export function FacePicker({ emoji, onEmoji, colour, onColour }: Props) {
  const styles = useStyles(makeStyles);
  return (
    <>
      <View style={styles.section}>
        <Text style={styles.label}>{copy.onboarding.profile.faceLabel}</Text>
        <View style={styles.faces}>
          {PROFILE_EMOJI.map((option) => {
            const active = option === emoji;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={copy.onboarding.profile.pickEmoji(option)}
                // Tapping the one already chosen clears it.
                onPress={() => onEmoji(active ? '' : option)}
                style={({ pressed }) => [
                  styles.face,
                  active && styles.faceActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.faceGlyph}>{option}</Text>
              </Pressable>
            );
          })}

          {/* The way back to initials that does not require guessing that
              tapping the chosen emoji again would do it. */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: emoji === '' }}
            accessibilityLabel={copy.onboarding.profile.pickInitials}
            onPress={() => onEmoji('')}
            style={({ pressed }) => [
              styles.face,
              emoji === '' && styles.faceActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.faceInitials}>{copy.onboarding.profile.initials}</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>{copy.onboarding.profile.faceHint}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{copy.onboarding.profile.colourLabel}</Text>
        <View style={styles.colours}>
          {habitColors.map((option, index) => {
            const active = option === colour;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={copy.onboarding.profile.pickColour(index)}
                onPress={() => onColour(option)}
                style={({ pressed }) => [styles.colourTap, pressed && styles.pressed]}
              >
                <View
                  style={[styles.colour, { backgroundColor: option }, active && styles.colourActive]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

const makeStyles = (colors: Palette) => ({
  section: { gap: spacing.sm },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textFaint,
  },
  faces: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  face: {
    minWidth: 52,
    height: 52,
    paddingHorizontal: 10,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  faceActive: {
    borderColor: colors.text,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  faceGlyph: { fontSize: 26 },
  faceInitials: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  colours: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  // The dot is 36px; the target around it is 44, as everything tappable is.
  colourTap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colour: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colourActive: { borderColor: colors.text },
  pressed: { opacity: 0.75 },
}) as const;
