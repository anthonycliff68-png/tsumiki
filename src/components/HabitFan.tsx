import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { copy } from '@/copy';
import { describeDays } from '@/data/defaults';
import type { TodayHabit } from '@/lib/api';
import { alpha, colors, display, fonts, radii, spacing } from '@/theme';

/** Cards either side of the front one that stay mounted — one spare, so a card
    slides in rather than appearing. */
const WINGS = 2;
const MOUNTED = WINGS + 1;

const CARD_W = 214;
/** Tuned so the caption and the check-in button still clear the dock. */
const CARD_H = 280;
/** How far apart the cards sit, how far they drop, and how far they lean. */
const SPREAD = 46;
const DROP = 16;
const LEAN = 7;
/** Finger travel that moves the fan on by one card. */
const TRAVEL = 96;
/** How much of a throw carries into where it lands. */
const FLICK = 0.11;
/** How far past either end the fan stretches before it pulls back. */
const OVERRUN = 0.45;

type Props = {
  habits: TodayHabit[];
  /** Minutes since midnight, or null when looking at another day. */
  nowMinutes: number | null;
  onCheckIn: (habit: TodayHabit) => void;
  onEdit: (habit: TodayHabit) => void;
  /** The card at the front, as it changes under the finger. */
  onFocus?: (habit: TodayHabit) => void;
  busy: boolean;
};

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/**
 * What is left of the day, held like a hand of cards.
 *
 * Everything is driven by one fractional position — 2.4 means "between the
 * third and fourth card" — and every card reads its own offset from it. So the
 * fan follows the finger the whole way, cards straightening and leaning as they
 * pass, instead of sliding as a block and snapping a card at a time. Only the
 * open habits are in the hand; the finished ones fold away behind a count.
 * Artboard: 3a.
 */
export function HabitFan({ habits, nowMinutes, onCheckIn, onEdit, onFocus, busy }: Props) {
  const { width } = useWindowDimensions();
  const position = useRef(new Animated.Value(0)).current;

  // The card the rest of the screen is about. It changes as the fan passes the
  // halfway point rather than when you let go, so the caption, the button and
  // the colour behind it all keep up with your finger.
  const [focus, setFocus] = useState(0);
  const focusRef = useRef(0);
  const settled = useRef(0);

  const last = Math.max(0, habits.length - 1);

  const land = useCallback(
    (index: number) => {
      const target = clamp(index, 0, last);
      settled.current = target;
      if (focusRef.current !== target) {
        focusRef.current = target;
        setFocus(target);
      }
      Animated.spring(position, {
        toValue: target,
        useNativeDriver: true,
        speed: 13,
        bounciness: 5,
      }).start();
    },
    [last, position],
  );

  // A check-in takes a card out of the hand: close the gap rather than leaving
  // the fan pointing past the end.
  useEffect(() => {
    if (settled.current > last) land(last);
  }, [last, land]);

  useEffect(() => {
    const habit = habits[focus];
    if (habit !== undefined) onFocus?.(habit);
  }, [focus, habits, onFocus]);

  // runOnJS throughout: this project drives gestures from the JS thread on
  // purpose, since the worklet runtime takes Expo Go down with it.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-10, 10])
        .onStart(() => {
          position.stopAnimation((value) => {
            settled.current = clamp(Math.round(value), 0, last);
          });
        })
        .onUpdate((event) => {
          const raw = settled.current - event.translationX / TRAVEL;
          position.setValue(clamp(raw, -OVERRUN, last + OVERRUN));

          // Stacking order cannot be interpolated, so it flips as the nearest
          // card changes — which is exactly when the caption should change too.
          const near = clamp(Math.round(raw), 0, last);
          if (near !== focusRef.current) {
            focusRef.current = near;
            setFocus(near);
          }
        })
        .onEnd((event) => {
          const thrown = event.translationX + event.velocityX * FLICK;
          land(Math.round(settled.current - thrown / TRAVEL));
        })
        .onFinalize(() => land(focusRef.current)),
    [last, position, land],
  );

  const current = habits[focus];
  if (current === undefined) return null;

  const left = (width - CARD_W) / 2;

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View style={styles.stage}>
          {habits.map((habit, index) => {
            if (Math.abs(index - focus) > MOUNTED) return null;

            // Every value below reads "how far is this card from the front",
            // as a continuous distance rather than a slot.
            const slide = position.interpolate({
              inputRange: [index - 3, index + 3],
              outputRange: [3 * SPREAD, -3 * SPREAD],
            });
            const drop = position.interpolate({
              inputRange: [index - 3, index, index + 3],
              outputRange: [3 * DROP, 0, 3 * DROP],
            });
            const lean = position.interpolate({
              inputRange: [index - 3, index + 3],
              outputRange: [`${3 * LEAN}deg`, `${-3 * LEAN}deg`],
            });
            const scale = position.interpolate({
              inputRange: [index - 2, index, index + 2],
              outputRange: [0.86, 1, 0.86],
              extrapolate: 'clamp',
            });
            // Cards stay solid: depth comes from shading, not transparency.
            // Half-lit cards overlapping each other read as mush mid-drag.
            // Opacity only sees the card off the end of the fan out.
            const fade = position.interpolate({
              inputRange: [index - 3, index - 2.3, index + 2.3, index + 3],
              outputRange: [0, 1, 1, 0],
              extrapolate: 'clamp',
            });
            // A card behind the front one darkens and gives up its name, both
            // continuously, so nothing pops as the fan turns.
            const behind = position.interpolate({
              inputRange: [index - 1.3, index, index + 1.3],
              outputRange: [0.58, 0, 0.58],
              extrapolate: 'clamp',
            });
            const nameIn = position.interpolate({
              inputRange: [index - 0.55, index, index + 0.55],
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            });

            const isFront = index === focus;
            const missed =
              !habit.checkedIn && nowMinutes !== null && habit.sortKey < nowMinutes;

            return (
              <Animated.View
                key={habit.id}
                style={[
                  styles.slot,
                  {
                    left,
                    zIndex: MOUNTED + 1 - Math.abs(index - focus),
                    opacity: fade,
                    transform: [
                      { translateX: slide },
                      { translateY: drop },
                      { rotate: lean },
                      { scale },
                    ],
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFront
                      ? copy.today.editLabel(habit.name)
                      : copy.today.bringForward(habit.name)
                  }
                  onPress={() => (isFront ? onEdit(habit) : land(index))}
                  style={[styles.card, { backgroundColor: habit.color }]}
                >
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.scrim, { opacity: behind }]}
                  />

                  <View style={styles.cardTop}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText} numberOfLines={1}>
                        {habit.anchorLabel ?? copy.today.anytimeShort}
                      </Text>
                    </View>
                    {missed && (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{copy.today.missed}</Text>
                      </View>
                    )}
                  </View>

                  <Animated.View style={{ opacity: nameIn }}>
                    <Text style={display(30, 27)} numberOfLines={3}>
                      {habit.name}
                    </Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {describeDays(habit.daysOfWeek)}
                    </Text>
                  </Animated.View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </GestureDetector>

      <View style={styles.pips}>
        {habits.map((habit, index) => (
          <View
            key={habit.id}
            style={[
              styles.pip,
              index === focus && styles.pipOn,
              index === focus && { backgroundColor: current.color },
            ]}
          />
        ))}
      </View>

      <View style={styles.caption}>
        <Text style={display(30, 28)} numberOfLines={2}>
          {current.name}
        </Text>
        <Text style={styles.captionSub}>
          {current.anchorLabel === null
            ? copy.today.anytime
            : copy.today.afterAnchor(current.anchorLabel)}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.today.checkInLabel(current.name)}
        disabled={busy}
        onPress={() => onCheckIn(current)}
        style={({ pressed }) => [
          styles.check,
          { backgroundColor: current.color },
          (pressed || busy) && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.checkLabel}>{copy.today.checkIn}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: CARD_H + WINGS * DROP + 16, marginTop: spacing.sm },
  slot: { position: 'absolute', width: CARD_W, height: CARD_H },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    padding: spacing.lg,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: alpha(colors.white, 0.16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
  },
  cardTop: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: radii.chip,
    backgroundColor: alpha('#000000', 0.3),
    paddingVertical: 5,
    paddingHorizontal: 12,
    maxWidth: CARD_W - spacing.lg * 2,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.text,
  },
  cardSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: alpha(colors.white, 0.75),
    marginTop: spacing.sm,
  },

  pips: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: spacing.md },
  pip: { width: 7, height: 7, borderRadius: 4, backgroundColor: alpha(colors.white, 0.2) },
  pipOn: { width: 22 },

  caption: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.md },
  captionSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  check: {
    height: 54,
    borderRadius: radii.chip,
    marginTop: spacing.lg,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: { ...display(17, 17), letterSpacing: 0.5, color: colors.text },
});
