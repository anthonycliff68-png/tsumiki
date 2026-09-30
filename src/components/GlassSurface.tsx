import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppearance } from '@/lib/appearance';

/**
 * Apple's Liquid Glass, where the OS has it.
 *
 * iOS 26 and up only. Read once, because it is a property of the build rather
 * than something that changes while running — and guarded, because the call
 * reaches for a native module and Expo Go carries a fixed set of them, throwing
 * rather than returning false when asked for one it does not have. Everyday
 * development happens in Expo Go, so an unguarded call would take down whatever
 * screen imported this.
 */
export const LIQUID_GLASS = ((): boolean => {
  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
})();

type Props = {
  /**
   * The surface's own style, including the fill it uses when there is no glass.
   * That fill is overridden when there is, since an opaque background under a
   * refractive material hides the very thing it is there to do.
   */
  style?: StyleProp<ViewStyle>;
  /** Carried into the glass, usually a habit's colour at low alpha. */
  tint?: string;
  /**
   * Frost the fallback rather than leaving it flat. True for chrome that floats
   * over live content, like the dock. The sheets keep their solid fill: they
   * already sit on a dimmed backdrop, and frosting them would be a visual
   * change on iOS 18 that nobody asked for.
   */
  blurFallback?: boolean;
  children: React.ReactNode;
};

/**
 * A floating surface: real glass on iOS 26, and what the app already looked
 * like everywhere else.
 *
 * One component rather than a conditional at each call site, because there are
 * six of these — the dock and five sheets — and a material that disagrees with
 * itself between two of them reads as a bug rather than a style.
 */
export function GlassSurface({ style, tint, blurFallback = false, children }: Props) {
  const { theme } = useAppearance();

  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={tint}
        // The app has its own light/dark choice and does not always agree with
        // the phone, so the glass is told which one it is sitting on.
        colorScheme={theme}
        style={[style, { backgroundColor: 'transparent' }]}
      >
        {children}
      </GlassView>
    );
  }

  if (blurFallback) {
    return (
      <BlurView intensity={24} tint={theme === 'dark' ? 'dark' : 'light'} style={style}>
        {children}
      </BlurView>
    );
  }

  return <View style={style}>{children}</View>;
}
