import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/lib/appearance';

/**
 * A fade behind the status bar, so scrolling content disappears into it rather
 * than colliding with it.
 *
 * Every tab is one long scroll that starts below the inset and then runs
 * straight up underneath the clock. On Today that meant THURSDAY and the day's
 * count sliding over the time and the battery — white on white, both of them
 * legible on their own and neither of them readable together.
 *
 * A fade rather than a hard band: each screen carries a large coloured bleed at
 * the top, and a solid bar would cut a flat edge across it. This keeps the
 * colour and takes the contrast out from under the system icons.
 *
 * Rendered once, over the whole tab area, because all five tabs scroll the same
 * way and had the same collision.
 */
export function StatusBarScrim() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  // The inset itself, plus a little below it for the gradient to land in.
  const height = insets.top + 18;
  if (height <= 18) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id="statusScrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bg} stopOpacity="0.96" />
            <Stop offset="0.55" stopColor={colors.bg} stopOpacity="0.82" />
            <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={height} fill="url(#statusScrim)" />
      </Svg>
    </View>
  );
}
