import { useRef, useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useStyles } from '@/lib/appearance';
import type { Palette } from '@/theme';

/** How long a card has to be held before it lifts and can be moved. */
export const HOLD_MS = 220;

/** What a held card tells the day, with the card's height in the window. */
export type Drag = {
  onPickUp: () => void;
  onHover: (y: number) => void;
  onDrop: (y: number) => void;
  onRelease: () => void;
};

/**
 * Tap it, or hold it and move it. The detector claims the touch before a
 * Pressable inside can see it, so the tap is handed in here; the Pressables
 * inside stay for VoiceOver, which activates them directly.
 */
export function Lift({ drag, onTap, children }: { drag: Drag; onTap: (x: number) => void; children: ReactNode }) {
  const styles = useStyles(makeStyles);
  const [offset] = useState(() => new Animated.ValueXY());
  const [scale] = useState(() => new Animated.Value(1));
  const ref = useRef<View>(null);
  /** From the finger to the card's middle, so the card is what aims. */
  const aim = useRef(0);
  const [held, setHeld] = useState(false);

  // runOnJS: the UI-thread path runs through Reanimated's worklets, which
  // segfault inside Expo Go.
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e, success) => {
      if (success) onTap(e.x);
    });
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(HOLD_MS)
    .onStart((e) => {
      ref.current?.measureInWindow((_x, y, _w, h) => {
        aim.current = y + h / 2 - e.absoluteY;
      });
      Animated.spring(scale, { toValue: 1.03, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
      setHeld(true);
      drag.onPickUp();
    })
    .onUpdate((e) => {
      offset.setValue({ x: e.translationX, y: e.translationY });
      drag.onHover(e.absoluteY + aim.current);
    })
    .onEnd((e, success) => {
      // Cancelled (the system took the touch): put nothing anywhere.
      if (success) drag.onDrop(e.absoluteY + aim.current);
    })
    .onFinalize(() => {
      Animated.spring(offset, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      setHeld(false);
      drag.onRelease();
    });

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View
        ref={ref}
        collapsable={false}
        style={[
          { transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale }] },
          // Solid while held: the cards are see-through, and one carried over
          // another read as two cards printed on top of each other.
          held && styles.held,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const makeStyles = (colors: Palette) =>
  ({
    held: {
      zIndex: 10,
      borderRadius: 16,
      backgroundColor: colors.bg,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
    },
  }) as const;
