import { BlurView } from 'expo-blur';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
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

/**
 * Holds glass shapes that should notice each other.
 *
 * Two GlassSurfaces inside one of these fuse as they come close and pull apart
 * as they separate, the way droplets do — which is the whole reason the check-in
 * orb is its own shape rather than a circle drawn inside the bar. `spacing` is
 * the distance at which they start reaching for each other.
 *
 * Note this is the opposite of nesting glass inside glass: that stacks two
 * panes and turns to mush. Here they are siblings, and the container resolves
 * them into one surface.
 *
 * Dark ground only. GlassContainer composites its children onto a surface of
 * its own and, unlike GlassView, takes no colorScheme — its whole API is
 * `spacing` — so on the light ground it renders the bar a dark olive-grey
 * whatever the children are told. Measured: (239,235,228) without it,
 * (99,95,84) with. Until it can be told which ground it is on, light mode gets
 * the shapes without the merging, which is a smaller loss than an unreadable
 * dock.
 */
export function GlassGroup({
  spacing,
  style,
  children,
}: {
  spacing?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const { theme } = useAppearance();

  if (LIQUID_GLASS && theme === 'dark') {
    return (
      <GlassContainer spacing={spacing} style={style}>
        {children}
      </GlassContainer>
    );
  }
  return <View style={style}>{children}</View>;
}
