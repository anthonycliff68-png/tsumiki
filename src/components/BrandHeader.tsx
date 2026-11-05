import type { ReactNode } from 'react';
import { Image, Text, View } from 'react-native';

import { SparkleButton } from '@/components/SparkleButton';
import { APP_NAME } from '@/constants/brand';
import { useStyles } from '@/lib/appearance';
import { display, spacing, type Palette } from '@/theme';

/**
 * The mark and the name, centred, at the top of every tab, with ✦ for the
 * brain dump on the right.
 *
 * It scrolls away with the content rather than being pinned. Pinned would
 * cost the space on every screen permanently and read as chrome; this way the
 * lockup is in every screenshot taken of the top of a screen, which is the
 * thing it is actually for. Nobody with the app open needs reminding what the
 * app is called — but every clip and still that goes out carries the name,
 * and an icon alone is unreadable in a thumbnail.
 *
 * The real app icon rather than a redrawn mark: it is already the three
 * stacked blocks on their dark tile, it is the thing people will have seen on
 * their home screen, and a second hand-built version of a logo is a second
 * thing to keep in step.
 */
export function BrandHeader({ left }: { left?: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <BrandMark />
      {/* Pinned, and drawn after the lockup so they take the taps, which keeps
          the name centred whatever sits beside it. */}
      <View style={[styles.side, { left: 0 }]}>{left}</View>
      <View style={[styles.side, { right: 0 }]}>
        <SparkleButton />
      </View>
    </View>
  );
}

/** The mark and the name on their own, for the screens outside the tabs. */
export function BrandMark({ large = false, markOnly = false }: { large?: boolean; markOnly?: boolean }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={large ? styles.lockupLarge : styles.lockup} accessibilityRole="header" accessibilityLabel={APP_NAME}>
      <Image
        source={require('../../assets/icon.png')}
        style={large ? styles.markLarge : styles.mark}
        // Decorative: the row already carries the name for a screen reader,
        // and announcing the logo twice helps nobody.
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      {!markOnly && <Text style={large ? styles.nameLarge : styles.name}>{APP_NAME}</Text>}
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  row: {
    minHeight: 36,
    justifyContent: 'center',
    // No rule under it. The hairline was there to make this read as chrome
    // the page sits beneath, but the screens below already carry their own
    // colour bleed, and a line across the top cut that bleed in half — the
    // header looked bolted on rather than part of the screen. Spacing does
    // the separating instead.
    paddingBottom: spacing.xs,
  },
  lockup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  lockupLarge: { alignItems: 'center', gap: spacing.sm },
  markLarge: { width: 64, height: 64, borderRadius: 16 },
  nameLarge: { ...display(24, 28), letterSpacing: 0, color: colors.text },
  side: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  mark: { width: 24, height: 24, borderRadius: 7 },
  name: {
    ...display(16, 18),
    // display() sets -1 for headlines, which at 16px closes a wordmark up
    // until it reads as one long word.
    letterSpacing: 0,
    color: colors.text,
  },
}) as const;
