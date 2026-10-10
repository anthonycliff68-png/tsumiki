import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { CheckIcon } from '@/components/icons';
import { ProgressRing } from '@/components/ProgressRing';
import { useTheme } from '@/lib/appearance';
import { alpha } from '@/theme';

const ORB_SIZE = 60;
const RING_INSET = 7;
const RING_STROKE = 3.5;

/** Long enough to read as filling, short enough that nobody waits for it. */
const FILL_MS = 420;
const DRAIN_MS = 260;

type Props = {
  color: string;
  /** Today's done / total for the ring. */
  done: number;
  total: number;
  checkedIn: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

/**
 * The 60pt check-in orb in the dock, ringed with today's progress.
 *
 * Checking in fills it rather than recolouring it. A colour that simply swaps
 * says the state changed; water arriving says *you* did it — and it is the same
 * gesture the card on My Day makes when it is struck off, so the two read as
 * one idea rather than two unrelated animations.
 *
 * It fills and stops. No bounce, no celebration: this happens several times a
 * day and anything pleased with itself would wear out by Wednesday.
 */
export function CheckInOrb({
  color,
  done,
  total,
  checkedIn,
  accessibilityLabel,
  onPress,
}: Props) {
  const colors = useTheme();
  const ringSize = ORB_SIZE + RING_INSET * 2;

  // Starts where it belongs, so an orb that was already checked when the screen
  // opened does not play the fill at somebody who did not just do anything.
  const rise = useRef(new Animated.Value(checkedIn ? 1 : 0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rise, {
      toValue: checkedIn ? 1 : 0,
      duration: checkedIn ? FILL_MS : DRAIN_MS,
      // Out-cubic going up: water arrives quickly and settles. In-quad coming
      // back: undoing should feel like it drains, not like it is yanked.
      easing: checkedIn ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [checkedIn, rise]);

  const give = (toValue: number) =>
    Animated.spring(press, { toValue, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: checkedIn }}
      onPress={onPress}
      onPressIn={() => give(1)}
      onPressOut={() => give(0)}
      hitSlop={8}
    >
      <Animated.View
        style={{
          width: ORB_SIZE,
          height: ORB_SIZE,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [
            { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
          ],
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: -RING_INSET,
            left: -RING_INSET,
            width: ringSize,
            height: ringSize,
          }}
        >
          <ProgressRing
            size={ringSize}
            strokeWidth={RING_STROKE}
            progress={total === 0 ? 0 : done / total}
            // The ring sits outside the orb, on the dock rather than on the
            // coloured fill, so it takes the ground's ink rather than white.
            color={colors.text}
            trackColor={alpha(colors.overlay, 0.16)}
          />
        </View>

        <View
          style={{
            width: ORB_SIZE,
            height: ORB_SIZE,
            borderRadius: ORB_SIZE / 2,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            // Clipped to the circle, so the water is a rising level rather
            // than a square sliding up behind it.
            overflow: 'hidden',
            boxShadow: `0px 0px 32px ${alpha(checkedIn ? colors.success : color, 0.85)}`,
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              // Taller than the orb so the rounded crest clears the top rather
              // than parking a curve across the middle of a full orb.
              top: 0,
              height: ORB_SIZE * 1.6,
              backgroundColor: colors.success,
              // A meniscus. Cheap, and at 60pt it is all the surface anyone
              // can see.
              borderTopLeftRadius: ORB_SIZE * 0.5,
              borderTopRightRadius: ORB_SIZE * 0.5,
              transform: [
                {
                  translateY: rise.interpolate({
                    inputRange: [0, 1],
                    outputRange: [ORB_SIZE, 0],
                  }),
                },
              ],
            }}
          />

          <CheckIcon
            size={24}
            color={checkedIn ? colors.bg : colors.white}
            strokeWidth={2.8}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export { ORB_SIZE };
