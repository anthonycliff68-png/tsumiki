import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useStyles, useTheme } from '@/lib/appearance';
import { fonts, radii, type Palette } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
};

/** The pale pill from the canvas: the one thing to do on a screen. */
export function PrimaryButton({ label, onPress, disabled, busy, icon }: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.bg} />
      ) : (
        <>
          <Text style={styles.primaryLabel}>{label}</Text>
          {icon}
        </>
      )}
    </Pressable>
  );
}

/** The quieter second option underneath it. */
export function TextButton({ label, onPress, disabled }: Omit<Props, 'busy' | 'icon'>) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.text, pressed && styles.pressed]}
    >
      <Text style={styles.textLabel}>{label}</Text>
    </Pressable>
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
