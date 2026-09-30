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
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { LinesIcon } from '@/components/icons';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { orderForDay } from '@/lib/today';
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
export const FILL_MS = 760;
/**
 * How far the water hangs outside the card.
 *
 * It tips about the bottom of the card, so at the ends of the rock the
 * corners swing out of the card's own rectangle. Overhang keeps colour under
 * them; the card clips it, so none of it is ever seen.
 */
const SPILL = 30;
/** How far it rocks. Past about six degrees it stops being water and starts being a lever. */
const TILT_DEG = 4.5;
/** How tall the swell is, peak to midline. */
const WAVE_AMP = 7;
/** The visible width the water has to cover, overhang included. */
const WATER_W = CARD_W + SPILL * 2;
/** One swell. A shade under the card's width reads as water rather than as a ripple. */
const WAVE_LEN = WATER_W / 1.15;
/**
 * The path carries a spare wavelength at each end, and is hung one wavelength
 * to the left of the card.
 *
 * One spare end is not enough: the two bodies drift in opposite directions, so
 * whichever one travels right would walk its own left edge into view and leave
 * a column of bare card behind it. With a wavelength either side, a slide of
 * up to one wavelength in either direction still covers the card, and landing
 * exactly on one wavelength puts the path back where it started so the travel
 * can loop without ever showing an end.
 */
const WAVE_W = WATER_W + WAVE_LEN * 2;
/** Tall enough to still reach past the bottom of the card when the water is at its lowest. */
const WAVE_H = CARD_H + SPILL + WAVE_AMP * 2;
/** How long one swell takes to cross. */
const WAVE_MS = 1100;

/**
 * A block of water whose top edge is a swell rather than a straight line.
 *
 * This is the whole reason the body is a path and not a rectangle. Anything
 * laid over a rectangle can only ever add to its top edge, so you get bumps
 * and never troughs, and an edge that only bulges upward still reads as a bar
 * with decoration. Cutting the swell into the body itself is the only way the
 * water gets to dip.
 *
 * Quadratics rather than a real sine: at this size the difference is invisible
 * and the control point is one number.
 */
function swell(): string {
  const reach = WAVE_AMP * 1.34;
  let d = `M0,${WAVE_AMP}`;
  for (let x = 0; x < WAVE_W; x += WAVE_LEN) {
    d += ` q${WAVE_LEN / 4},${-reach} ${WAVE_LEN / 2},0`;
    d += ` q${WAVE_LEN / 4},${reach} ${WAVE_LEN / 2},0`;
  }
  return `${d} L${WAVE_W},${WAVE_H} L0,${WAVE_H} Z`;
}
const SWELL = swell();
/**
 * Where the swell's midline sits at rest and at the brim, as a translateY.
 *
 * The path carries its midline WAVE_AMP below its own top, so both ends are
 * offset by that: at the brim the midline has to land on the card's top edge,
 * not the swell's peaks.
 */
const DEEP = CARD_H - FLOOR - WAVE_AMP;
const HIGH = -WAVE_AMP;
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
/**
 * How long the finished card takes to travel back into the deck.
 *
 * It runs at the end of the fill rather than after it, so the water settling
 * and the card leaving are one movement — the card is already standing in its
 * new place at the moment the hand re-sorts underneath it.
 */
const DEAL_MS = 300;

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

  /**
   * The card on its way back into the deck, and how many slots it has to go.
   *
   * A finished habit belongs behind everything still open, and it used to get
   * there by vanishing from the front and reappearing at the back. So it is
   * walked there instead: the same offsets its destination slot would give it,
   * animated from where it is. Where it is going is not guessed — the fan runs
   * the same order the screen does, so the card travels to the slot it will
   * actually have.
   */
  const deal = useRef(new Animated.Value(0)).current;
  const [dealt, setDealt] = useState<{ id: string; from: number; slots: number } | null>(null);
  const wereDone = useRef<ReadonlySet<string>>(new Set());
  const dealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (dealTimer.current !== null) clearTimeout(dealTimer.current);
  }, []);

  useEffect(() => {
    const done = new Set(habits.filter((habit) => habit.checkedIn).map((habit) => habit.id));
    const fresh = habits.find((habit) => habit.checkedIn && !wereDone.current.has(habit.id));
    wereDone.current = done;
    if (fresh === undefined) return;
    const from = habits.findIndex((habit) => habit.id === fresh.id);
    const to = orderForDay(habits).findIndex((habit) => habit.id === fresh.id);
    // Undoing, or a habit already in its place, has nowhere to travel.
    if (to <= from) return;
    // Deliberately not cleaned up when habits changes: the check-in updates
    // the array again before this fires, and tearing the timer down there
    // would mean the card never travelled at all.
    if (dealTimer.current !== null) clearTimeout(dealTimer.current);
    dealTimer.current = setTimeout(() => {
      setDealt({ id: fresh.id, from, slots: to - from });
      deal.setValue(0);
      Animated.timing(deal, {
        toValue: 1,
        duration: DEAL_MS,
        // Loads up, then throws. A symmetrical curve made the card drift back
        // politely; this one holds still for a beat and then goes, which is
        // what makes it read as being dealt rather than as sliding.
        easing: Easing.bezier(0.62, -0.28, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }, Math.max(0, FILL_MS - DEAL_MS));
  }, [habits, deal]);

  // It has arrived when the hand re-sorts under it: from there its own slot
  // draws it exactly where the travel left it, so the offset comes off. Doing
  // this on the re-sort rather than on the animation ending means a frame of
  // slack either way is invisible — both states put the card in one place.
  useEffect(() => {
    if (dealt === null) return;
    const stillThere = habits[dealt.from]?.id === dealt.id;
    const stillDone = habits.find((habit) => habit.id === dealt.id)?.checkedIn === true;
    if (stillThere && stillDone) return;
    deal.setValue(0);
    setDealt(null);
  }, [habits, dealt, deal]);

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
        .onTouchesUp((event) => {
          // Where the finger ended up, not just whether move events happened
          // to arrive. A quick flick can deliver almost no onTouchesMove, and
          // judging it on those alone called it a tap — so a fast swipe
          // through the hand silently checked a habit in instead of turning
          // the fan. The finger's own travel cannot be missed this way.
          const up = event.allTouches[0];
          const flicked =
            up !== undefined &&
            (Math.abs(up.x - touch.current.x) > TAP_SLOP ||
              Math.abs(up.y - touch.current.y) > TAP_SLOP);
          if (dragged.current || flicked) return;
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
            // Degrees, not a string, so the travel below can be added to it.
            const leanBy = position.interpolate({
              inputRange: [index - 3, index + 3],
              outputRange: [3 * LEAN, -3 * LEAN],
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

            // How many slots this card is currently walking back, and the
            // offsets its destination slot would hand it. Adding them to the
            // live ones means the two agree exactly when the hand re-sorts.
            const going = dealt !== null && dealt.id === habit.id ? dealt.slots : 0;
            const out = (to: number) =>
              deal.interpolate({ inputRange: [0, 1], outputRange: [0, to] });
            const slideTo = going === 0 ? slide : Animated.add(slide, out(going * SPREAD));
            const dropTo = going === 0 ? drop : Animated.add(drop, out(going * DROP));
            const leanTo = going === 0 ? leanBy : Animated.add(leanBy, out(going * LEAN));
            const lean = leanTo.interpolate({
              inputRange: [-90, 90],
              outputRange: ['-90deg', '90deg'],
            });
            // The scale its destination gives it, so it shrinks into the deck
            // rather than shrinking and then being resized on arrival.
            // A multiplier that runs from 1 to whatever the destination wants,
            // rather than from 0 — the offsets above start at nothing, but a
            // scale starting at nothing is a card that is not there.
            const toward = (end: number) =>
              deal.interpolate({ inputRange: [0, 1], outputRange: [1, end] });
            // Rises off the deck before it goes back into it, rather than
            // shrinking the whole way — the lift is what gives the throw
            // somewhere to come from.
            const scaleTo =
              going === 0
                ? scale
                : Animated.multiply(
                    scale,
                    deal.interpolate({
                      inputRange: [0, 0.22, 1],
                      outputRange: [1, 1.07, Math.max(0.86, 1 - 0.07 * going)],
                    }),
                  );
            // Darkens and gives up its name on the way, exactly as a card that
            // was dragged to the same place would.
            const behindTo = going === 0 ? behind : Animated.add(behind, out(0.58));
            const nameTo = going === 0 ? nameIn : Animated.multiply(nameIn, toward(0));

            const isFront = index === focus && going === 0;
            const missed =
              !habit.checkedIn && nowMinutes !== null && habit.sortKey < nowMinutes;

            return (
              <Animated.View
                key={habit.id}
                style={[
                  styles.slot,
                  {
                    left,
                    // A card on its way back goes under the hand as it leaves,
                    // or it travels across the top of the cards it is joining.
                    zIndex: going === 0 ? MOUNTED + 1 - Math.abs(index - focus) : 0,
                    opacity: fade,
                    transform: [
                      { translateX: slideTo },
                      { translateY: dropTo },
                      { rotate: lean },
                      { scale: scaleTo },
                    ],
                  },
                ]}
              >
                <FanCard
                  habit={habit}
                  isFront={isFront}
                  missed={missed}
                  busy={busy}
                  behind={behindTo}
                  nameIn={nameTo}
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
  /**
   * The swell crossing the card, 0 to 1 being one wavelength.
   *
   * The two bodies multiply it by opposite signs, so their surfaces cross each
   * other rather than sliding along together — two sheets moving as one is the
   * thing that reads as a texture scrolling instead of as water.
   */
  const drift = useRef(new Animated.Value(0)).current;
  const drifting = useRef<Animated.CompositeAnimation | null>(null);
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
      drift.setValue(0);
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
        // Slower and looser than it was. Weight is mostly a matter of how long
        // something takes to stop moving, so the overshoot is bigger and the
        // settle is longer rather than the travel being dragged out.
        speed: 9,
        bounciness: 15,
        useNativeDriver: true,
      }).start();

      // The swell only crosses while there is a surface to see it on. Left
      // running it would be a texture scrolling under a full card forever.
      drifting.current?.stop();
      drift.setValue(0);
      drifting.current = Animated.loop(
        Animated.timing(drift, {
          toValue: 1,
          duration: WAVE_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      drifting.current.start();
      setTimeout(() => drifting.current?.stop(), FILL_MS);

      // Hard one way, most of the way back, a smaller pass, level. Each swing
      // shorter and slower than the last, or it reads as a wobble rather than
      // as something heavy losing its energy.
      tilt.setValue(0);
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -0.7, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0.34, duration: 190, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -0.12, duration: 110, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
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
      drifting.current?.stop();
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
  }, [habit.checkedIn, rise, wash, tilt, drift, pop]);

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
        {/* The pale water, running ahead of the colour and caught by it: light
            reaches the top of a glass before the liquid does. Its own swell,
            crossing at its own speed, so the two surfaces never move as one
            sheet. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.body,
            {
              opacity: wash.interpolate({
                inputRange: [0, 0.25, 0.85, 1],
                outputRange: [0, 0.7, 0.55, 0],
              }),
              transform: [
                { translateY: wash.interpolate({ inputRange: [0, 1], outputRange: [DEEP, HIGH] }) },
                { translateX: Animated.multiply(drift, -WAVE_LEN) },
              ],
            },
          ]}
        >
          <Svg width={WAVE_W} height={WAVE_H}>
            <Path d={SWELL} fill={tint(habit.color, 0.42)} />
          </Svg>
        </Animated.View>

        {/* The water itself. It rides up rather than stretching, so the swell
            keeps its shape the whole way instead of being squashed flat at the
            bottom of the card and pulled tall at the top. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.body,
            {
              transform: [
                { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [DEEP, HIGH] }) },
                { translateX: Animated.multiply(drift, WAVE_LEN) },
              ],
            },
          ]}
        >
          <Svg width={WAVE_W} height={WAVE_H}>
            <Defs>
              <LinearGradient id={`fanWater-${habit.id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={tint(habit.color, 0.2)} />
                <Stop offset="0.5" stopColor={habit.color} />
                <Stop offset="1" stopColor={shade(habit.color, 0.22)} />
              </LinearGradient>
            </Defs>
            {/* Deeper at the bottom than at the top: one flat colour is a
                filled shape, the same colour with depth in it is a volume. */}
            <Path d={SWELL} fill={`url(#fanWater-${habit.id})`} />
            {/* The lit edge, drawn along the swell rather than across the card,
                so it curves with the surface it belongs to. It was a straight
                bar, which is the one thing a waterline never is. */}
            <Path
              d={SWELL}
              fill="none"
              stroke={tint(habit.color, 0.78)}
              strokeWidth={3}
              opacity={0.85}
            />
          </Svg>
        </Animated.View>
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
  // Wider than the card on both sides, and hung from the top so the rise is a
  // translate. At the ends of the rock the corners swing outside the card, and
  // without the overhang each one would show as a wedge of bare card.
  body: {
    position: 'absolute',
    left: -SPILL - WAVE_LEN,
    top: 0,
    width: WAVE_W,
    height: WAVE_H,
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
