import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { useDockClearance } from '@/components/Dock';
import { colors, display, fonts, spacing } from '@/theme';

type Props = {
  /** The habit colour this screen is "about" — it drives the bleed. */
  color: string;
  /** Screens outside the tabs (sign-in, onboarding) have no dock to clear. */
  underDock?: boolean;
  children: ReactNode;
};

/** Dark ground + colour bleed + room for the floating dock. Every tab uses it. */
export function Screen({ color, underDock = true, children }: Props) {
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
  return <Text style={[styles.eyebrow, color ? { color } : null]}>{children}</Text>;
}

export function Title({ children, size = 56 }: { children: ReactNode; size?: number }) {
  return <Text style={display(size, size * 0.9)}>{children}</Text>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

/** Placeholder card for the screens that arrive in later build steps. */
export function Stub({ children }: { children: ReactNode }) {
  return (
    <View style={styles.stub}>
      <Text style={styles.stubText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
