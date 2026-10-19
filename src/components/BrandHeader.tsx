import { Image, Text, View } from 'react-native';

import { APP_NAME } from '@/constants/brand';
import { useStyles } from '@/lib/appearance';
import { display, fonts, spacing, type Palette } from '@/theme';

/**
 * The mark and the name, centred, at the top of every tab.
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
export function BrandHeader() {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={APP_NAME}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.mark}
        // Decorative: the row already carries the name for a screen reader,
        // and announcing the logo twice helps nobody.
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.name}>{APP_NAME}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    // No rule under it. The hairline was there to make this read as chrome
    // the page sits beneath, but the screens below already carry their own
    // colour bleed, and a line across the top cut that bleed in half — the
    // header looked bolted on rather than part of the screen. Spacing does
    // the separating instead.
    paddingBottom: spacing.xs,
  },
  mark: { width: 24, height: 24, borderRadius: 7 },
  name: {
    ...display(16, 18),
    // display() sets -1 for headlines, which at 16px closes a wordmark up
    // until it reads as one long word.
    letterSpacing: 0,
    color: colors.text,
  },
}) as const;
