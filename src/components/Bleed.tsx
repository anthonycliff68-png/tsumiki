import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useTheme } from '@/lib/appearance';
import { alpha, companionColor } from '@/theme';

/** The canvas was drawn at 390 pt wide; the glows scale from that. */
const DESIGN_WIDTH = 390;
const CROSSFADE_MS = 400;

/**
 * How much of the glow survives on a light ground.
 *
 * The canvas is dark, and these opacities were read off it. On near-black a
 * colour wash *adds* light: it reads as depth behind the content. On near-white
 * the identical numbers *darken and saturate*, so the same four circles stop
 * being atmosphere and become a coloured panel — and every card, label and
 * hairline sitting on top of it loses most of its contrast.
 *
 * This is why light mode looked washed out while the palette itself measured
 * fine: nothing was wrong with the colours, they were just being asked to sit
 * on a ground that was no longer the near-white they were chosen against.
 */
const LIGHT_STRENGTH = 0.3;

/**
 * What the glows come down to now there is a photograph behind them.
 *
 * The four circles were invented to give a flat black screen some weather —
 * depth, a light source, somewhere for the eye to rest. A photograph does all
 * of that already and does it better, so running both at full strength is two
 * atmospheres stacked: the glows tint the sky, the sky tints back, and the
 * result is the purple murk that made the mountain look like a smudge rather
 * than a mountain.
 *
 * They are not removed, because they are also the only thing on screen
 * carrying the colour of the habit you are looking at — that is a signal, not
 * decoration, and it is what makes Crews feel like a different place from
 * Today. Dropped this far they still tint, but the photograph stays the thing
 * you see.
 */
const GLOW_OVER_BACKDROP = 0.26;

/** The photograph's own opacity, and the scrim that flattens it to a ground. */
const BACKDROP_OPACITY = { dark: 0.52, light: 0.16 };
const SCRIM_ALPHA = { dark: 0.5, light: 0.82 };

type CircleSpec = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  width: number;
  height: number;
  /** Alpha at the centre of the glow. */
  opacity: number;
  /** Which hue: the screen's own colour, or the one that sits behind it. */
  hue: 'primary' | 'companion';
};

/**
 * Four glows, following the canvas: a big one bleeding off the top left, a
 * second hue on the right, a low wash under the content, and a small one part
 * way down the left edge. Geometry is in canvas points and scales with width.
 */
const CIRCLES: CircleSpec[] = [
  { top: -280, left: -220, width: 680, height: 620, opacity: 0.62, hue: 'primary' },
  { top: -40, right: -230, width: 470, height: 470, opacity: 0.5, hue: 'companion' },
  { bottom: -230, left: -40, width: 540, height: 400, opacity: 0.26, hue: 'primary' },
  { top: 250, left: -160, width: 380, height: 380, opacity: 0.3, hue: 'companion' },
];

/**
 * The canvas draws each glow as a solid circle under a 100px Gaussian blur.
 * React Native has no blur filter on iOS, so the same falloff is drawn directly
 * as a radial gradient.
 *
 * A blurred disc keeps a broad flat centre and falls away late — an even ramp
 * reads as a weak vignette instead, which is what the first version looked
 * like next to the canvas.
 */
function glow(color: string, peak: number): string {
  return (
    `radial-gradient(ellipse closest-side at 50% 50%, ` +
    `${alpha(color, peak)} 0%, ` +
    `${alpha(color, peak)} 28%, ` +
    `${alpha(color, peak * 0.86)} 48%, ` +
    `${alpha(color, peak * 0.42)} 72%, ` +
    `${alpha(color, 0)} 100%)`
  );
}

type Layer = { key: number; color: string; anim: Animated.Value };

/**
 * The colour bleed that sits behind every screen: three big soft circles
 * tinted with the colour of the habit the screen is about. When that colour
 * changes the new glow cross-fades in over 400ms.
 */
export function Bleed({ color }: { color: string }) {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const scale = width / DESIGN_WIDTH;
  const strength = (colors.dark ? 1 : LIGHT_STRENGTH) * GLOW_OVER_BACKDROP;

  const nextKey = useRef(1);
  const currentColor = useRef(color);
  const [layers, setLayers] = useState<Layer[]>(() => [
    { key: 0, color, anim: new Animated.Value(1) },
  ]);

  useEffect(() => {
    if (color === currentColor.current) return;
    currentColor.current = color;

    const layer: Layer = { key: nextKey.current++, color, anim: new Animated.Value(0) };
    setLayers((prev) => [...prev, layer]);

    Animated.timing(layer.anim, {
      toValue: 1,
      duration: CROSSFADE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      // Drop everything this layer has now fully covered.
      setLayers((prev) => prev.filter((l) => l.key >= layer.key));
    });
  }, [color]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
      {/* The photograph, under everything.
       *
       * It goes here rather than on each screen because Bleed is already the
       * one thing behind all of them, and a backdrop that only some screens
       * had would read as a bug.
       *
       * The scrim over it is doing the real work. A photograph is the wrong
       * shape for an interface: it has its own light and dark, in places the
       * layout knows nothing about, so text over the raw image is legible in
       * the top half and gone in the bottom. The scrim flattens it back to a
       * ground with a predictable value, and the image survives as texture
       * rather than as a picture.
       *
       * Light needs a far heavier scrim than dark, and that is not a taste
       * call: the palette's text is near-black, so every pale part of the
       * photograph — sky, snow — is competing with it directly. Dark text on
       * a mountain is the one combination that cannot be rescued by nudging
       * opacity, so on light the image is pushed almost to a watermark. */}
      <Image
        source={require('../../assets/backdrop.jpg')}
        style={[
          StyleSheet.absoluteFill,
          { opacity: colors.dark ? BACKDROP_OPACITY.dark : BACKDROP_OPACITY.light },
        ]}
        resizeMode="cover"
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: alpha(
              colors.bg,
              colors.dark ? SCRIM_ALPHA.dark : SCRIM_ALPHA.light,
            ),
          },
        ]}
      />
      {layers.map((layer) => (
        <Animated.View
          key={layer.key}
          style={[StyleSheet.absoluteFill, { opacity: layer.anim }]}
        >
          {CIRCLES.map((circle, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: circle.top === undefined ? undefined : circle.top * scale,
                bottom: circle.bottom === undefined ? undefined : circle.bottom * scale,
                left: circle.left === undefined ? undefined : circle.left * scale,
                right: circle.right === undefined ? undefined : circle.right * scale,
                width: circle.width * scale,
                height: circle.height * scale,
                borderRadius: (circle.width * scale) / 2,
                experimental_backgroundImage: glow(
                  circle.hue === 'companion' ? companionColor(layer.color) : layer.color,
                  circle.opacity * strength,
                ),
              }}
            />
          ))}
        </Animated.View>
      ))}
    </View>
  );
}
