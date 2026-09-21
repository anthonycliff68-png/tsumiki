import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';

import { alpha, tint } from '@/theme';

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
  /** How far the circle's colour is mixed towards white. */
  lighten: number;
};

/** Three large soft glows, straight off the canvas. */
const CIRCLES: CircleSpec[] = [
  { top: -264, left: -212, width: 644, height: 588, opacity: 0.42, lighten: 0 },
  { top: -24, right: -224, width: 448, height: 448, opacity: 0.28, lighten: 0.35 },
  { bottom: -212, left: -32, width: 504, height: 364, opacity: 0.14, lighten: 0 },
];

/**
 * The canvas draws each glow as a solid circle under a 100px Gaussian blur.
 * React Native has no blur filter on iOS, so the same falloff is drawn directly
 * as a radial gradient — cheaper, and it does not need a native module.
 */
function glow(color: string, peak: number): string {
  return (
    `radial-gradient(ellipse closest-side at 50% 50%, ` +
    `${alpha(color, peak)} 0%, ` +
    `${alpha(color, peak * 0.82)} 34%, ` +
    `${alpha(color, peak * 0.34)} 66%, ` +
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
                  circle.lighten > 0 ? tint(layer.color, circle.lighten) : layer.color,
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
