import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { WaterPress } from '@/components/WaterPress';
import { useStyles, useTheme } from '@/lib/appearance';
import { fonts, radii, type Palette } from '@/theme';

type Props = {
  label: string;
  /** Read out instead of the label, when the visible word is too terse alone. */
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
};

/** The pale pill from the canvas: the one thing to do on a screen. */
export function PrimaryButton({ label, accessibilityLabel, onPress, disabled, busy, icon }: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const inactive = disabled || busy;
  return (
    <WaterPress
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      disabled={inactive}
      onPress={onPress}
      radius={radii.chip}
      // The swell is drawn in the ground colour because this button's fill is
      // the text colour — ink on a near-white pill, which is the only thing
      // that reads on it.
      tint={colors.bg}
      style={[styles.primary, inactive && styles.inactive]}
    >
      {busy ? (
        <ActivityIndicator color={colors.bg} />
      ) : (
        <>
          <Text style={styles.primaryLabel}>{label}</Text>
          {icon}
        </>
      )}
    </WaterPress>
  );
}

/** The quieter second option underneath it. */
export function TextButton({ label, accessibilityLabel, onPress, disabled }: Omit<Props, 'busy' | 'icon'>) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.text, pressed && styles.pressed]}
    >
      <Text style={styles.textLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * The action that belongs to one section rather than to the whole screen.
 *
 * PrimaryButton is 58pt tall and full width: it is the one thing a screen is
 * for. A settings screen has three or four things, and giving each of them that
 * treatment produces a stack of identical hero pills with no hierarchy at all —
 * nothing reads as more important than anything else, because nothing is.
 *
 * This sizes to its label and sits at the end of its row.
 */
export function CompactButton({
  label,
  accessibilityLabel,
  onPress,
  disabled,
  busy,
}: Omit<Props, 'icon'>) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const inactive = disabled || busy;
  return (
    <WaterPress
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      disabled={inactive}
      onPress={onPress}
      radius={radii.chip}
      tint={colors.bg}
      style={[styles.compact, inactive && styles.inactive]}
    >
      {busy ? (
        <ActivityIndicator color={colors.bg} size="small" />
      ) : (
        <Text style={styles.compactLabel}>{label}</Text>
      )}
    </WaterPress>
  );
}

const makeStyles = (colors: Palette) => ({
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 20,
    borderRadius: radii.chip,
    backgroundColor: colors.text,
  },
  primaryLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.bg,
  },
  compact: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
    // 44 is the smallest a touch target may be, and this is deliberately at
    // that floor rather than below it.
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: 20,
    borderRadius: radii.chip,
    backgroundColor: colors.text,
  },
  compactLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.bg,
  },
  text: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  textLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  inactive: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.8,
  },
}) as const;
