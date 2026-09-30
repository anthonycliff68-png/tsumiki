import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { LinesIcon } from '@/components/icons';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { describeDays, formatTime } from '@/data/defaults';
import type { TodayHabit } from '@/lib/api';
import { alpha, display, fonts, radii, shade, spacing, tint, type Palette } from '@/theme';
import { Display } from '@/components/Screen';
import { GlassSurface, LIQUID_GLASS } from '@/components/GlassSurface';

/** Cards either side of the front one that stay mounted — one spare, so a card
    slides in rather than appearing. */
const WINGS = 2;
const MOUNTED = WINGS + 1;

const CARD_W = 214;
/** Tuned so the caption and the check-in button still clear the dock. */
const CARD_H = 264;
/** How far apart the cards sit, how far they drop, and how far they lean. */
const SPREAD = 46;
const DROP = 16;
const LEAN = 7;
/** The colour left showing along the bottom of a card still to do. */
/**
 * The ground under the habit's name, and only under it.
 *
 * A band rather than a shade over the whole card: the point of the glass is to
 * see through it, and darkening all of it gives that back. The name is the one
 * thing that has to read on every background, so it gets its own floor and the
 * rest of the card stays a window.
 *
 * An explicit height, not a percentage — react-native-svg does not resolve 100%
 * against the parent's real size, which left the shade stopping short of the
 * card's bottom edge.
 */
const NAME_SHADE = 168;
const FLOOR = 6;
/**
 * How long the colour takes to flood the card.
 *
 * Exported because the Today screen has to know it: the hand re-sorts a done
 * habit to the back, and if it did that on the tap it would take this
 * animation with it. The two numbers being one constant is what stops them
 * drifting into a card that leaves before it has filled.
 */
export const FILL_MS = 600;
/**
 * How far the water hangs outside the card.
 *
 * It tips about the bottom of the card, so at the ends of the rock the
 * corners swing out of the card's own rectangle. Overhang keeps colour under
 * them; the card clips it, so none of it is ever seen.
 */
const SPILL = 30;
/** How far it rocks. Past about four degrees it stops being water and starts being a lever. */
const TILT_DEG = 3;
/** The scale that leaves a FLOOR-tall sliver showing, now the fill hangs below the card. */
const REST = (FLOOR + SPILL) / (CARD_H + SPILL);
/**
 * How thick the lit edge of the water is.
 *
 * It is also how far short of the card top the edge stops, so the two are one
 * constant — the old hard-coded 2 was the previous thickness and drifted the
 * moment the edge got thicker than a rule.
 */
const MENISCUS = 10;
/** The corner of the front card that opens it for editing. */
const HANDLE_HIT = 56;
/** A press that moves less than this, for less than this long, is a tap. */
const TAP_SLOP = 8;
const TAP_TIME = 600;
/** More pips than this and they stop being countable, so show a figure. */
const PIP_LIMIT = 10;
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
  onToggle: (habit: TodayHabit) => void;
  onEdit: (habit: TodayHabit) => void;
  /** The card at the front, as it changes under the finger. */
  onFocus?: (habit: TodayHabit) => void;
  /** Where to open the hand: the first habit still to do. */
  initialFocus?: number;
  busy: boolean;
};

/**
 * When a habit happens, short enough for the corner of a card. A habit with a
 * set time is not "anytime" — only one with no time at all is.
 */
function whenOf(habit: TodayHabit): string {
  if (habit.anchorLabel !== null) return habit.anchorLabel;
  if (habit.mode === 'at' && habit.time !== null) return formatTime(habit.time);
  return copy.today.anytimeShort;
}

function whenLongOf(habit: TodayHabit): string {
  if (habit.anchorLabel !== null) return copy.today.afterAnchor(habit.anchorLabel);
  if (habit.mode === 'at' && habit.time !== null) return copy.today.atTime(formatTime(habit.time));
  return copy.today.anytime;
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/**
 * The day, held like a hand of cards.
 *
 * Everything is driven by one fractional position — 2.4 means "between the
 * third and fourth card" — and every card reads its own offset from it. So the
 * fan follows the finger the whole way, cards straightening and leaning as they
 * pass, instead of sliding as a block and snapping a card at a time.
 *
 * A card is hollow until it is done and then fills with its colour, the same
 * way a row does everywhere else. The whole card is the target, so checking in
 * and undoing are the same gesture; editing is the rarer thing, so it gets the
 * small three-line handle in the corner. Finished habits stay in the hand —
 * take them out and there would be no way back to undo one. Artboard: 3a.
 */
export function HabitFan({
  habits,
  nowMinutes,
  onToggle,
  onEdit,
  onFocus,
  initialFocus = 0,
  busy,
}: Props) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
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
      held.current = habits[target]?.id ?? held.current;
      Animated.spring(position, {
        toValue: target,
        useNativeDriver: true,
        speed: 13,
        bounciness: 5,
      }).start();
    },
    [last, position, habits],
  );

  // Open on the habit the screen was told to, once the day has actually
  // arrived — the first render usually has nothing in it yet.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || habits.length === 0) return;
    opened.current = true;
    const start = clamp(initialFocus, 0, habits.length - 1);
    focusRef.current = start;
    held.current = habits[start]?.id ?? null;
    settled.current = start;
    setFocus(start);
    position.setValue(start);
  }, [habits, initialFocus, position]);

  // Stay on the habit you were looking at, not the slot it happened to be in:
  // adding or removing a habit elsewhere in the day must not swap the card
  // under your thumb.
  const held = useRef<string | null>(null);
  useEffect(() => {
    if (!opened.current || held.current === null) return;
    const at = habits.findIndex((habit) => habit.id === held.current);
    // ...unless it moved because you just finished it. The order deals a done
    // habit to the back of the hand on purpose, and following it there would
    // park you on the card you are done with. Hold the slot instead, so the
    // next thing to do comes forward under your thumb.
    const follow = at !== -1 && !habits[at]?.checkedIn;
    const start = follow ? at : clamp(focusRef.current, 0, Math.max(0, habits.length - 1));
    // Re-point first and always: held has to name the card actually in front,
    // or the next change chases a habit that is no longer the one you can see.
    held.current = habits[start]?.id ?? null;
    if (start === focusRef.current) return;
    focusRef.current = start;
    settled.current = start;
    setFocus(start);
    position.setValue(start);
  }, [habits, position]);

  // The hand can also shrink from under the fan.
  useEffect(() => {
    if (settled.current > last) land(last);
  }, [last, land]);

  useEffect(() => {
    const habit = habits[focus];
    if (habit !== undefined) onFocus?.(habit);
  }, [focus, habits, onFocus]);

  const cardLeft = (width - CARD_W) / 2;
  const touch = useRef({ x: 0, y: 0, at: 0 });
  const dragged = useRef(false);
  const aim = useRef({ cardLeft, focus, habits, onToggle, onEdit, busy });
  aim.current = { cardLeft, focus, habits, onToggle, onEdit, busy };

  /** A press that never travelled: work out what it landed on. */
  const tapped = (x: number, y: number) => {
    const { cardLeft: at, focus: index, habits: all, busy: working } = aim.current;
    const habit = all[index];
    land(index);
    if (habit === undefined || working) return;
    // Past either edge of the front card is a wing: bring that one forward.
    if (x < at) return land(index - 1);
    if (x > at + CARD_W) return land(index + 1);
    // The handle's corner, given a generous target.
    if (x > at + CARD_W - HANDLE_HIT && y < HANDLE_HIT) return aim.current.onEdit(habit);
    aim.current.onToggle(habit);
  };

  // One gesture, not two. A tap and a drag composed as separate gestures —
  // nested, raced or exclusive — left the pan unable to activate, so the fan
  // would not turn.
  //
  // The tap rides on the pan's raw touches instead. Those fire whether or not
  // the pan ever activates, so the pan keeps its horizontal threshold — which
  // is what lets a vertical drag fall through to the scroll view — and a touch
  // that never became a drag is still a tap.
  //
  // runOnJS throughout: this project drives gestures from the JS thread on
  // purpose, since the worklet runtime takes Expo Go down with it.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-10, 10])
        // Give up the moment the drag reads as vertical, or the fan swallows
        // every scroll and everything below it becomes unreachable.
        .failOffsetY([-14, 14])
        .onTouchesDown((event) => {
          const first = event.allTouches[0];
          touch.current = { x: first?.x ?? 0, y: first?.y ?? 0, at: Date.now() };
          dragged.current = false;
        })
        .onTouchesMove((event) => {
          const first = event.allTouches[0];
          if (first === undefined) return;
          const far =
            Math.abs(first.x - touch.current.x) > TAP_SLOP ||
            Math.abs(first.y - touch.current.y) > TAP_SLOP;
          if (far) dragged.current = true;
        })
        .onTouchesUp(() => {
          if (dragged.current) return;
          if (Date.now() - touch.current.at > TAP_TIME) return;
          tapped(touch.current.x, touch.current.y);
        })
        .onStart(() => {
          dragged.current = true;
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
            held.current = aim.current.habits[near]?.id ?? held.current;
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

  const left = cardLeft;


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
                <FanCard
                  habit={habit}
                  isFront={isFront}
                  missed={missed}
                  busy={busy}
                  behind={behind}
                  nameIn={nameIn}
                  onPress={() => (isFront ? onToggle(habit) : land(index))}
                  onEdit={() => onEdit(habit)}
                  
                  style={[
                    styles.card,
                    {
                      borderColor: habit.checkedIn ? alpha(colors.overlay, 0.16) : habit.color,
                      borderWidth: habit.checkedIn ? 1 : 1.5,
                    },
                  ]}
                />
              </Animated.View>
            );
          })}
        </View>
      </GestureDetector>

      {habits.length <= PIP_LIMIT ? (
        <View style={styles.pips}>
          {habits.map((habit, index) => (
            <View
              key={habit.id}
              style={[
                styles.pip,
                habit.checkedIn && { backgroundColor: alpha(colors.overlay, 0.5) },
                index === focus && styles.pipOn,
                index === focus && { backgroundColor: current.color },
              ]}
            />
          ))}
        </View>
      ) : (
        <Text style={[styles.counter, { color: current.color }]}>
          {copy.today.cardOf(focus + 1, habits.length)}
        </Text>
      )}

      <View style={styles.caption}>
        <Display size={30} line={28} numberOfLines={2}>
          {current.name}
        </Display>
        <Text style={styles.captionSub}>{whenLongOf(current)}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ checked: current.checkedIn }}
        accessibilityLabel={
          current.checkedIn ? copy.today.undoCheckIn : copy.today.checkInLabel(current.name)
        }
        disabled={busy}
        onPress={() => onToggle(current)}
        style={({ pressed }) => [
          styles.check,
          current.checkedIn
            ? { backgroundColor: 'transparent', borderWidth: 2, borderColor: current.color }
            : { backgroundColor: current.color },
          (pressed || busy) && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.checkLabel}>
          {current.checkedIn ? copy.today.undoCheckIn : copy.today.checkIn}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * One card. Its tap is a gesture rather than a Pressable: a Pressable nested
 * inside a GestureDetector never fires here, so the whole surface would look
 * tappable and do nothing. The edit handle is a gesture of its own, nested
 * deeper so it wins the tap that lands on it.
 */
function FanCard({
  habit,
  isFront,
  missed,
  busy,
  behind,
  nameIn,
  onPress,
  onEdit,
  style,
}: {
  habit: TodayHabit;
  isFront: boolean;
  missed: boolean;
  busy: boolean;
  behind: Animated.AnimatedInterpolation<string | number>;
  nameIn: Animated.AnimatedInterpolation<string | number>;
  onPress: () => void;
  onEdit: () => void;
  style: StyleProp<ViewStyle>;
}) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  // Checking in floods the card from a floor of colour up to the brim. Scale,
  // not height, so all of it can run on the native driver.
  //
  // Three things move together, because one of them alone reads as a state
  // change rather than as having done something: the colour rises, a bright
  // line rides its surface and fades as it arrives, and the card takes a
  // short push outwards and settles. Undoing drains, quicker and flatter —
  // taking something back should not feel like a reward.
  const rise = useRef(new Animated.Value(habit.checkedIn ? 1 : 0)).current;
  /**
   * A paler wash that runs ahead of the colour and then is caught by it.
   *
   * One rectangle rising is a bar chart. Two, with the lighter one arriving
   * first and the body closing over it, is water — the light reaches the top of
   * a glass before the liquid does.
   */
  const wash = useRef(new Animated.Value(habit.checkedIn ? 1 : 0)).current;
  /**
   * The rock, from -1 (tipped left) to 1 (tipped right).
   *
   * Water thrown into a container does not arrive level. It slaps up one side,
   * comes back across, and takes a couple of passes to settle — which is the
   * difference between a liquid and a rectangle that grew.
   */
  const tilt = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    const done = habit.checkedIn;
    // Cards mount mid-fan all the time; only a real change should play.
    if (first.current) {
      first.current = false;
      rise.setValue(done ? 1 : 0);
      wash.setValue(done ? 1 : 0);
      tilt.setValue(0);
      return;
    }

    if (done) {
      // A spring rather than a curve, for the undershoot on the way back: the
      // level runs past the brim, drops under it for an instant so a sliver of
      // empty card reappears at the top, and only then fills for good. That
      // rebound is the moment the whole thing reads as liquid — an easing that
      // merely slows into place never uncovers anything, so it cannot.
      Animated.spring(rise, {
        toValue: 1,
        speed: 14,
        bounciness: 12,
        useNativeDriver: true,
      }).start();

      // Hard one way, most of the way back, a smaller pass, level. Each swing
      // shorter and slower than the last, or it reads as a wobble rather than
      // as something heavy losing its energy.
      tilt.setValue(0);
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -0.62, duration: 150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0.26, duration: 150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else {
      // Draining is flat and quick, and does not rock. Taking something back
      // should not feel like a reward.
      Animated.timing(rise, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
      Animated.timing(tilt, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }

    // Ahead of the body on the way up, behind it on the way down, so the pale
    // edge always leads and the colour always closes.
    Animated.timing(wash, {
      toValue: done ? 1 : 0,
      duration: done ? 340 : 300,
      easing: done ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();

    if (!done) {
      pop.setValue(0);
      return;
    }
    Animated.sequence([
      Animated.delay(60),
      Animated.timing(pop, {
        toValue: 1,
        duration: 130,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(pop, {
        toValue: 0,
        speed: 11,
        bounciness: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [habit.checkedIn, rise, wash, tilt, pop]);

  return (
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityState={{ checked: habit.checkedIn, disabled: busy }}
        accessibilityLabel={
          isFront
            ? habit.checkedIn
              ? copy.today.undoCheckIn
              : copy.today.checkInLabel(habit.name)
            : copy.today.bringForward(habit.name)
        }
        accessibilityActions={[{ name: 'activate' }, { name: 'magicTap' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'magicTap') onEdit();
          else onPress();
        }}
        style={[
          style,
          // The front card gives up its fill so the glass behind it can do the
          // work. The ones behind stay opaque — four stacked panes of glass is
          // the mush the time picker taught us about.
          isFront && LIQUID_GLASS && { backgroundColor: 'transparent' },
          { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] },
        ]}
      >
        {/* First child, so everything else sits on top of it. Tinted with the
            habit's own colour, which is the only thing telling you whose card
            this is once the fill is gone. */}
        {isFront && (
          <GlassSurface
            variant="clear"
            style={StyleSheet.absoluteFill as ViewStyle}
            tint={alpha(habit.color, 0.2)}
          />
        )}
        {/* Glass has whatever is behind it, and what is behind it moves. The
            name needs its own ground or it is legible on some days and not
            others. Under the check-in floor, so the floor still reads. */}
        {isFront && LIQUID_GLASS && (
          <Svg width={CARD_W} height={NAME_SHADE} style={styles.nameShade} pointerEvents="none">
            <Defs>
              <LinearGradient id={`fanShade-${habit.id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.bg} stopOpacity="0" />
                <Stop offset="0.5" stopColor={colors.bg} stopOpacity="0.66" />
                <Stop offset="1" stopColor={colors.bg} stopOpacity="0.92" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={CARD_W} height={NAME_SHADE} fill={`url(#fanShade-${habit.id})`} />
          </Svg>
        )}

        {/* Everything below rocks together, pivoting on the bottom of the
            card, so the waterline tips as one surface rather than each layer
            tipping on its own. The rotation lives out here because a rotate
            composed after a scaleY is a skew, not a turn. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.water,
            {
              transform: [
                {
                  rotate: tilt.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [`-${TILT_DEG}deg`, `${TILT_DEG}deg`],
                  }),
                },
              ],
            },
          ]}
        >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fill,
            {
              backgroundColor: tint(habit.color, 0.42),
              opacity: wash.interpolate({
                inputRange: [0, 0.25, 0.85, 1],
                outputRange: [0, 0.75, 0.6, 0],
              }),
              transform: [
                {
                  scaleY: wash.interpolate({
                    inputRange: [0, 1],
                    outputRange: [REST, 1],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.fill,
            {
              transform: [
                {
                  scaleY: rise.interpolate({
                    inputRange: [0, 1],
                    outputRange: [REST, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Deeper at the bottom than at the top. One flat colour is a filled
              rectangle; the same colour with depth in it is a volume. Explicit
              height again — react-native-svg will not resolve a percentage
              against a parent it cannot measure. */}
          <Svg width={CARD_W + SPILL * 2} height={CARD_H + SPILL}>
            <Defs>
              <LinearGradient id={`fanWater-${habit.id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={tint(habit.color, 0.2)} />
                <Stop offset="0.55" stopColor={habit.color} />
                <Stop offset="1" stopColor={shade(habit.color, 0.22)} />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={CARD_W + SPILL * 2}
              height={CARD_H + SPILL}
              fill={`url(#fanWater-${habit.id})`}
            />
          </Svg>
        </Animated.View>
        {/* The bright edge of the colour as it climbs, gone once it lands. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.surface,
            {
              backgroundColor: tint(habit.color, 0.72),
              opacity: wash.interpolate({
                inputRange: [0, 0.08, 0.78, 1],
                outputRange: [0, 0.85, 0.7, 0],
              }),
              transform: [
                {
                  translateY: wash.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-(SPILL + FLOOR), -(SPILL + CARD_H - MENISCUS)],
                  }),
                },
              ],
            },
          ]}
        />
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.scrim, { opacity: behind }]} />

        {/* Fades on the same curve as the name. The name already gave itself
            up on the cards behind; the chips did not, so through clear glass
            you read the next habit's time through this one's. */}
        <Animated.View style={[styles.cardTop, { opacity: nameIn }]}>
          <View style={styles.tags}>
            <View style={[styles.tag, !habit.checkedIn && styles.tagHollow]}>
              <Text style={styles.tagText} numberOfLines={1}>
                {whenOf(habit)}
              </Text>
            </View>
            {missed && (
              <View style={[styles.tag, !habit.checkedIn && styles.tagHollow]}>
                <Text style={styles.tagText}>{copy.today.missed}</Text>
              </View>
            )}
          </View>

          {/* The card itself checks in; editing is rarer, so it gets the
              handle in the corner. Both are recognised by the stage's own tap
              gesture rather than their own, because nesting a detector inside
              the fan's pan stops either from firing. */}
          <View style={styles.handle}>
            <LinesIcon size={18} color={alpha(colors.overlay, 0.55)} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: nameIn }}>
          <Display size={30} line={27} numberOfLines={3}>
            {habit.name}
          </Display>
          <Text style={styles.cardSub} numberOfLines={1}>
            {describeDays(habit.daysOfWeek)}
            {habit.checkedIn ? ` \u00b7 ${copy.today.doneTag}` : ''}
          </Text>
        </Animated.View>
      </Animated.View>
  );
}

const makeStyles = (colors: Palette) => ({
  stage: { height: CARD_H + WINGS * DROP + 16, marginTop: spacing.sm },
  slot: { position: 'absolute', width: CARD_W, height: CARD_H },
  // The frame the water rocks in: the card's own bounds, pivoting on its
  // bottom edge so the surface swings and the base stays put.
  water: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transformOrigin: 'bottom' },
  // Wider and deeper than the card on every side but the top. At the ends of
  // the rock the corners swing outside the card, and without the overhang each
  // one would show as a wedge of bare card under the water.
  fill: {
    position: 'absolute',
    left: -SPILL,
    right: -SPILL,
    bottom: -SPILL,
    height: CARD_H + SPILL,
    transformOrigin: 'bottom',
  },
  card: {
    width: '100%',
    height: '100%',
    // The card is always opaque, or the cards behind show through the fan.
    backgroundColor: colors.bg,
    borderRadius: 26,
    padding: spacing.lg,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: alpha(colors.overlay, 0.16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  nameShade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  // Was a two-point white rule, which is a line and not a surface. Thicker,
  // softer and in the habit's own colour lifted towards white: light sitting on
  // water rather than a border drawn across it.
  surface: {
    position: 'absolute',
    left: -SPILL,
    right: -SPILL,
    bottom: -SPILL,
    height: MENISCUS,
    borderRadius: MENISCUS / 2,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  tags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  handle: { padding: 2, marginTop: 2 },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: radii.chip,
    backgroundColor: alpha('#000000', 0.3),
    paddingVertical: 5,
    paddingHorizontal: 12,
    maxWidth: CARD_W - spacing.lg * 2 - 26,
  },
  // Was a tenth, which disappeared against clear glass. It reads on an opaque
  // card too, so there is no need for two of them.
  tagHollow: {
    backgroundColor: alpha(colors.overlay, 0.18),
    borderWidth: 1,
    borderColor: alpha(colors.overlay, 0.18),
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
    color: alpha(colors.overlay, 0.75),
    marginTop: spacing.sm,
  },

  pips: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: spacing.md },
  pip: { width: 7, height: 7, borderRadius: 4, backgroundColor: alpha(colors.overlay, 0.2) },
  pipOn: { width: 22 },
  counter: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.md,
  },

  caption: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.sm },
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
}) as const;
