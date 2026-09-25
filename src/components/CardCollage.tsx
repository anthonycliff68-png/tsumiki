import { Dimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { WelcomeScreen, type ScreenKind } from '@/components/WelcomeScreens';
import { useStyles, useTheme } from '@/lib/appearance';
import { habitColors, type Palette } from '@/theme';

const { width: W } = Dimensions.get('window');

/**
 * Real screens, tilted, fading into the ground.
 *
 * They were abstract coloured rectangles first. Rectangles say "an app has
 * colours"; these say "here is the app". Someone deciding whether to sign up
 * can see what they would be signing up to before they type anything.
 *
 * Three is the most that fits without any of them becoming a sliver.
 */
const SHEETS: { k: ScreenKind; c: string; x: number; y: number; r: string }[] = [
  { k: 'crew', c: habitColors[0], x: -0.52, y: 26, r: '-11deg' },
  { k: 'progress', c: habitColors[2], x: 0.22, y: 8, r: '10deg' },
  { k: 'day', c: habitColors[1], x: -0.18, y: 74, r: '2deg' },
];

export function CardCollage({ height = 400, fadeFrom = 60 }: { height?: number; fadeFrom?: number }) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  // The tail past the cards is what removes the seam.
  const fadeHeight = (height - fadeFrom) * 1.85;
  return (
    <>
      <View style={[styles.collage, { height }]} pointerEvents="none">
        {SHEETS.map((sheet) => (
          <View
            key={sheet.k}
            style={[
              styles.sheet,
              { left: W * 0.5 + W * sheet.x, top: sheet.y, transform: [{ rotate: sheet.r }] },
            ]}
          >
            <WelcomeScreen kind={sheet.k} color={sheet.c} />
          </View>
        ))}
      </View>
      <Svg width={W} height={fadeHeight} style={[styles.fade, { top: fadeFrom }]}>
        <Defs>
          <LinearGradient id="collageFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bg} stopOpacity="0" />
            <Stop offset="0.34" stopColor={colors.bg} stopOpacity="0.9" />
            <Stop offset="0.56" stopColor={colors.bg} stopOpacity="1" />
            {/* Past the cards it lets go again, so the bleed returns instead
                of reappearing at a hard line. */}
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={fadeHeight} fill="url(#collageFade)" />
      </Svg>
    </>
  );
}

const makeStyles = (_colors: Palette) => ({
  collage: { position: 'absolute', top: 0, left: 0, right: 0 },
  sheet: { position: 'absolute', width: 210, height: 430 },
  fade: { position: 'absolute', left: 0 },
}) as const;
