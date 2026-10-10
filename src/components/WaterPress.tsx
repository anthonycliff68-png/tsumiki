import { useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { alpha } from '@/theme';

/** How long the swell takes to cross the button and fade out. */
const SWELL_MS = 520;

type Props = {
  onPress: () => void;
  disabled?: boolean;
  /** The pill's own shape. The swell is clipped to it, so this has to match. */
  radius: number;
  /** What the swell is made of — the ink that reads on this button's fill. */
  tint: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  accessibilityState?: { disabled?: boolean; busy?: boolean };
  children: ReactNode;
};

/**
 * A press that behaves like the water does elsewhere in this app.
 *
 * Two things happen, both on the native driver so neither can be held up by
 * whatever the press itself kicks off on the JavaScript thread — a button that
 * stutters at the exact moment it is tapped is worse than one that does
 * nothing.
 *
 * The button gives under the finger, by a spring rather than a timing curve:
 * pressing a real thing has weight, and a linear squash reads as a slide. And
 * a swell rises *from where the finger actually landed* and spreads out across
 * the pill. Starting it from the centre is the usual shortcut and it is the
 * thing that makes a ripple feel generic — the whole point is that the surface
 * is responding to you, there, rather than playing a canned animation.
 */
export function WaterPress({
  onPress,
  disabled,
  radius,
  tint,
  style,
  accessibilityLabel,
  accessibilityState,
  children,
}: Props) {
  const give = useRef(new Animated.Value(0)).current;
  const swell = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Big enough that a swell starting in a corner still reaches the far one.
  const reach = Math.max(size.width, size.height) * 2.2;

  const press = (toValue: number) =>
    Animated.spring(give, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();

  const onPressIn = (e: GestureResponderEvent) => {
    setOrigin({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
    press(1);

    swell.setValue(0);
    fade.setValue(1);
    Animated.parallel([
      Animated.timing(swell, {
        toValue: 1,
        duration: SWELL_MS,
        // Out-cubic: quick at the start, slowing as it goes, which is how a
        // spreading ripple actually loses energy.
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 0,
        duration: SWELL_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={() => press(0)}
      onLayout={(e) =>
        setSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      <Animated.View
        style={[
          style,
          // overflow hidden keeps the swell inside the pill rather than letting
          // it spill out as a square.
          { overflow: 'hidden', borderRadius: radius },
          {
            transform: [
              {
                scale: give.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }),
              },
            ],
          },
        ]}
      >
        {size.width > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: origin.x - reach / 2,
              top: origin.y - reach / 2,
              width: reach,
              height: reach,
              borderRadius: reach / 2,
              backgroundColor: alpha(tint, 0.22),
              opacity: fade,
              transform: [{ scale: swell }],
            }}
          />
        )}
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** The same give, without the swell, for a surface too large to ripple
 *  convincingly — a settings row, where a swell crossing the whole width reads
 *  as the screen moving rather than the row being pressed. */
export function PressGive({
  onPress,
  children,
  style,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}) {
  const give = useRef(new Animated.Value(0)).current;
  const press = (toValue: number) =>
    Animated.spring(give, { toValue, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => press(1)}
      onPressOut={() => press(0)}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [
              { scale: give.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
