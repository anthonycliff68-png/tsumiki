import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ChevronLeftIcon } from '@/components/icons';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { fonts, radii, type Palette } from '@/theme';

/** Four steps: welcome, routine, first habit, crew. */
const TOTAL_STEPS = 4;

type Props = {
  /** 0-based, counting the welcome screen as step 0. */
  step: number;
  onBack?: () => void;
  onSkip: () => void;
};

export function OnboardingHeader({ step, onBack, onSkip }: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.onboarding.back}
          onPress={() => (onBack ? onBack() : router.back())}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeftIcon size={18} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}

      <View
        style={styles.dots}
        accessibilityRole="progressbar"
        accessibilityLabel={copy.onboarding.progress(step + 1, TOTAL_STEPS)}
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step && styles.dotCurrent,
              i <= step ? styles.dotDone : styles.dotTodo,
            ]}
          />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.onboarding.skip}
        onPress={onSkip}
        style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
      >
        <Text style={styles.skipLabel}>{copy.onboarding.skip}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.chip,
  },
  dotCurrent: {
    width: 22,
  },
  dotDone: {
    backgroundColor: colors.text,
  },
  dotTodo: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
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
