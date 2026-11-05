import { Pressable, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandHeader';
import { ChevronLeftIcon } from '@/components/icons';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { alpha, fonts, radii, type Palette } from '@/theme';

type Props = {
  /** 1-based. With `total`, draws the progress bar; left out, there is none. */
  step?: number;
  total?: number;
  /** Left out on a first page, which has nowhere to go back to. */
  onBack?: () => void;
  /** Left out by a step with nothing to skip to. */
  onSkip?: () => void;
};

/** Back, a thin progress bar, and Skip where there is one. */
export function OnboardingHeader({ step, total, onBack, onSkip }: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  return (
    <View style={styles.root}>
      <BrandMark />
      <View style={styles.row}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.onboarding.back}
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeftIcon size={18} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}

      {step && total ? (
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityLabel={copy.onboarding.progress(step, total)}
        >
          <View style={[styles.fill, { width: `${(step / total) * 100}%` }]} />
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {onSkip ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.onboarding.skip}
          onPress={onSkip}
          style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
        >
          <Text style={styles.skipLabel}>{copy.onboarding.skip}</Text>
        </Pressable>
      ) : (
        // Keeps the bar centred with nothing on the right.
        <View style={styles.spacer} />
      )}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 44,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(colors.overlay, 0.08),
    borderWidth: 1,
    borderColor: colors.border,
  },
  spacer: { width: 44, height: 44 },
  track: {
    flex: 1,
    height: 4,
    borderRadius: radii.chip,
    backgroundColor: alpha(colors.overlay, 0.18),
    overflow: 'hidden',
  },
  fill: { height: 4, borderRadius: radii.chip, backgroundColor: colors.text },
  skip: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textFaint,
  },
  pressed: {
    opacity: 0.7,
  },
}) as const;
