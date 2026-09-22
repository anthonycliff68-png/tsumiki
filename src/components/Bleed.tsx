import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';

import { alpha, companionColor } from '@/theme';

/** The canvas was drawn at 390 pt wide; the glows scale from that. */
const DESIGN_WIDTH = 390;
const CROSSFADE_MS = 400;

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
  const scale = width / DESIGN_WIDTH;

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
                  circle.opacity,
                ),
              }}
            />
          ))}
        </Animated.View>
      ))}
    </View>
  );
}
