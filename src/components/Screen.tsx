import type { ReactNode } from 'react';
import { ScrollView, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { useDockClearance } from '@/components/Dock';
import { useStyles, useTheme } from '@/lib/appearance';
import { display, fonts, spacing, type Palette } from '@/theme';

type Props = {
  /** The habit colour this screen is "about" — it drives the bleed. */
  color: string;
  /** Screens outside the tabs (sign-in, onboarding) have no dock to clear. */
  underDock?: boolean;
  children: ReactNode;
};

/** Dark ground + colour bleed + room for the floating dock. Every tab uses it. */
export function Screen({ color, underDock = true, children }: Props) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const dockClearance = useDockClearance();
  const clearance = underDock ? dockClearance : insets.bottom + spacing.xxl;

  return (
    <View style={styles.root}>
      <Bleed color={color} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xxl,
          paddingHorizontal: spacing.xl,
          paddingBottom: clearance,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** The small caps line above a display heading. */
export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const styles = useStyles(makeStyles);
  return <Text style={[styles.eyebrow, color ? { color } : null]}>{children}</Text>;
}

export function Title({ children, size = 56 }: { children: ReactNode; size?: number }) {
  return <Display size={size} line={size * 0.9}>{children}</Display>;
}

/**
 * A heading in the display face, in the colour of whichever theme is on.
 *
 * display() deliberately sets no colour — it is a plain function and cannot
 * read the theme, and baking in the dark palette's near-white is what made
 * every heading vanish on a light background. The colour belongs here, where
 * the theme is actually readable.
 */
export function Display({
  size,
  line,
  numberOfLines,
  style,
  children,
}: {
  size: number;
  line?: number;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}) {
  const colors = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[display(size, line ?? size), { color: colors.text }, style]}
    >
      {children}
    </Text>
  );
}

export function Body({ children }: { children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return <Text style={styles.body}>{children}</Text>;
}

/** Placeholder card for the screens that arrive in later build steps. */
export function Stub({ children }: { children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.stub}>
      <Text style={styles.stubText}>{children}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
  stub: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  stubText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textFaint,
  },
}) as const;
