import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

/** One step of the stagger. Short: the gap between the first and last item is
 *  what a person actually feels, and four groups at 110ms is already half a
 *  second before the screen has finished arriving. */
const STEP_MS = 55;
const RISE_MS = 380;

/**
 * Brings a section in: a short rise, with a fade.
 *
 * Settings screens arrive all at once and land as a wall. Letting each group
 * come in just behind the one above gives the eye an order to read them in,
 * which is the whole reason they were grouped in the first place.
 *
 * Deliberately small — 10pt and under half a second. A settings screen that
 * makes a performance of itself is one you have to sit through every time you
 * want to change a notification.
 */
export function Reveal({
  index = 0,
  style,
  children,
}: {
  /** Position in the stagger. 0 arrives first. */
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = Animated.timing(enter, {
      toValue: 1,
      duration: RISE_MS,
      delay: index * STEP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    run.start();
    // Stopped rather than left running: a screen popped before it finished
    // would otherwise keep animating a view nobody is looking at.
    return () => run.stop();
  }, [enter, index]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
