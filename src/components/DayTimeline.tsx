import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

import { LinesIcon } from '@/components/icons';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { describeDays, formatTimeGutter } from '@/data/defaults';
import type { TodayHabit } from '@/lib/api';
import type { Anchor } from '@/lib/models';
import { alpha, display, fonts, habitColors, momentColor, radii, spacing, type Palette } from '@/theme';

const GUTTER = 58;
const RAIL_GAP = 8;

/** An hour is never shorter than this, so an empty hour still reads as an hour. */
const HOUR_MIN = 72;
/** Past this many habits, a moment folds the finished ones away. */
const STACK_CAP = 3;

/**
 * Checking a habit off, in milliseconds.
 *
 * The habit's colour floods up from the bottom of the card, crests, brims over,
 * throws a few droplets off the edges, and the card folds down to its line with
 * the strike drawing across. About two thirds of a second end to end — long
 * enough to register, short enough that the twelfth one of the day is still
 * welcome.
 */
const RISE_MS = 220;
const BRIM_MS = 110;
const FOLD_MS = 180;
const STRIKE_MS = 160;
const SPLASH_MS = 340;
/** How tall the crest riding the top of the water is. */
const WAVE_H = 7;
/** What a finished habit stands down to, and the smallest thing worth tapping. */
const DONE_ROW_H = 44;

/**
 * Where each droplet is thrown, as a fraction of the card it came off.
 *
 * Fixed rather than random: a habit that splashes differently every time reads
 * as a glitch rather than as water, and nobody checks a habit off often enough
 * to notice the pattern. Mostly up and out, because that is where water goes
 * when a surface stops it.
 */
const DROPS = [
  { x: -0.54, y: -0.62, r: 3 },
  { x: -0.34, y: -0.92, r: 2 },
  { x: -0.12, y: -0.74, r: 2.5 },
  { x: 0.1, y: -0.98, r: 2 },
  { x: 0.3, y: -0.7, r: 3 },
  { x: 0.52, y: -0.86, r: 2 },
  { x: -0.62, y: -0.18, r: 2 },
  { x: 0.63, y: -0.26, r: 2.5 },
  { x: 0.42, y: -0.42, r: 1.5 },
] as const;

export type DropTarget =
  | { kind: 'anchor'; anchorId: string; label: string }
  | { kind: 'hour'; hour: number };

/** One line of the day: a bare hour, a moment, a timed habit, or the now line. */
type Line =
  | { kind: 'hour'; time: string }
  | { kind: 'moment'; time: string; anchor: Anchor; habits: TodayHabit[] }
  | { kind: 'habit'; time: string; habit: TodayHabit }
  | { kind: 'now'; time: string };

type HourRow = {
  hour: number;
  lines: Line[];
  spans: { id: string; color: string }[];
};

type Props = {
  anchors: Anchor[];
  habits: TodayHabit[];
  nowMinutes: number;
  onToggle: (habit: TodayHabit) => void;
  onEditHabit: (habit: TodayHabit) => void;
  onEditAnchor: (anchor: Anchor) => void;
  onMove: (habit: TodayHabit, target: DropTarget) => void;
  onDragChange: (dragging: boolean) => void;
};

/** The day, hour by hour. Artboard: MyDay, extended to a full grid. */
export function DayTimeline({
  anchors,
  habits,
  nowMinutes,
  onToggle,
  onEditHabit,
  onEditAnchor,
  onMove,
  onDragChange,
}: Props) {
  const styles = useStyles(makeStyles);
  const nodes = useRef(new Map<string, { node: View; target: DropTarget }>());
  const rects = useRef<{ key: string; top: number; bottom: number; target: DropTarget }[]>([]);

  const [carried, setCarried] = useState<TodayHabit | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [opened, setOpened] = useState<string[]>([]);

  const rows = useMemo(
    () => buildHours(anchors, habits, nowMinutes),
    [anchors, habits, nowMinutes],
  );

  // The rail column is the same width on every row, or rows holding a block
  // would sit indented and the timeline would step in and out.
  const railWidth = useMemo(() => {
    const most = rows.reduce((max, row) => Math.max(max, row.spans.length), 0);
    return most === 0 ? 0 : most * 4 + (most - 1) * 3;
  }, [rows]);

  const registerTarget = (key: string, target: DropTarget) => (node: View | null) => {
    if (node) nodes.current.set(key, { node, target });
    else nodes.current.delete(key);
  };

  const measureTargets = () => {
    const found: typeof rects.current = [];
    nodes.current.forEach(({ node, target }, key) => {
      node.measureInWindow((_x, y, _width, height) => {
        found.push({ key, top: y, bottom: y + height, target });
        rects.current = found;
      });
    });
  };

  /** The smallest box containing the point, so a moment beats its hour. */
  const findRect = (y: number) => {
    const hits = rects.current.filter((rect) => y >= rect.top && y < rect.bottom);
    if (hits.length === 0) return undefined;
    return hits.reduce((best, rect) =>
      rect.bottom - rect.top < best.bottom - best.top ? rect : best,
    );
  };

  const hover = (y: number) => {
    const key = findRect(y)?.key ?? null;
    setHoveredKey((current) => (current === key ? current : key));
  };

  const pickUp = (habit: TodayHabit) => {
    measureTargets();
    setCarried(habit);
    onDragChange(true);
  };

  const drop = (habit: TodayHabit, y: number) => {
    const target = findRect(y)?.target ?? null;
    setCarried(null);
    setHoveredKey(null);
    onDragChange(false);
    if (target) onMove(habit, target);
  };

  const release = () => {
    setCarried(null);
    setHoveredKey(null);
    onDragChange(false);
  };

  const toggleStack = (anchorId: string) =>
    setOpened((open) =>
      open.includes(anchorId) ? open.filter((id) => id !== anchorId) : [...open, anchorId],
    );

  /** A tall stack folds, but only ever hides habits that are already done:
      anything still open stays on the timeline where you can reach it. */
  const fold = (anchorId: string, list: TodayHabit[]) => {
    if (opened.includes(anchorId) || list.length <= STACK_CAP) {
      return { shown: list, hidden: 0 };
    }
    let room = Math.max(0, STACK_CAP - list.filter((habit) => !habit.checkedIn).length);
    const shown = list.filter((habit) => {
      if (!habit.checkedIn) return true;
      if (room === 0) return false;
      room -= 1;
      return true;
    });
    return { shown, hidden: list.length - shown.length };
  };

  const cardFor = (habit: TodayHabit) => (
    <HabitCard
      key={habit.id}
      habit={habit}
      carried={carried?.id === habit.id}
      onToggle={() => onToggle(habit)}
      onEdit={() => onEditHabit(habit)}
      onPickUp={() => pickUp(habit)}
      onHover={hover}
      onDrop={(y) => drop(habit, y)}
      onRelease={release}
    />
  );

  return (
    <View>
      <Text style={styles.hint}>{copy.myDay.dragHint}</Text>

      {rows.map((row) => (
        <View
          key={row.hour}
          ref={registerTarget(`hour-${row.hour}`, { kind: 'hour', hour: row.hour })}
          style={[styles.hourRow, hoveredKey === `hour-${row.hour}` && styles.hovered]}
        >
          {/* Blocks run behind the lines, so a long one stays unbroken. */}
          {row.spans.length > 0 && (
            <View style={[styles.railLayer, { left: GUTTER + RAIL_GAP }]} pointerEvents="none">
              {row.spans.map((span) => (
                <View key={span.id} style={[styles.span, { backgroundColor: span.color }]} />
              ))}
            </View>
          )}

          {row.lines.map((line, index) => (
            <View key={`${row.hour}-${index}`} style={styles.line}>
              <Text style={[styles.gutter, line.kind === 'now' && styles.gutterNow]}>
                {line.time}
              </Text>

              {/* A block runs its rail behind the whole hour; a moment with no
                  duration marks just its own slot, so every moment reads the
                  same way in the rail column. */}
              <View style={[styles.railCell, { width: railWidth + RAIL_GAP * 2 }]}>
                {line.kind === 'moment' && line.anchor.ends_at === null && (
                  <View
                    style={[styles.tick, { backgroundColor: momentColor(line.anchor) }]}
                  />
                )}
              </View>

              <View style={styles.lineBody}>
                {line.kind === 'moment' && (
                  <View
                    ref={registerTarget(`anchor-${line.anchor.id}`, {
                      kind: 'anchor',
                      anchorId: line.anchor.id,
                      label: line.anchor.label,
                    })}
                    style={[
                      styles.momentGroup,
                      hoveredKey === `anchor-${line.anchor.id}` && styles.hovered,
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${line.anchor.label}, edit`}
                      onPress={() => onEditAnchor(line.anchor)}
                    >
                      <Text
                        style={[styles.momentLabel, { color: momentColor(line.anchor) }]}
                      >
                        {line.anchor.label}
                      </Text>
                    </Pressable>
                    {fold(line.anchor.id, line.habits).shown.map(cardFor)}
                    {(() => {
                      const { hidden } = fold(line.anchor.id, line.habits);
                      const open = opened.includes(line.anchor.id);
                      if (hidden === 0 && !open) return null;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            open
                              ? copy.myDay.foldStack(line.anchor.label)
                              : copy.myDay.unfoldStack(hidden, line.anchor.label)
                          }
                          onPress={() => toggleStack(line.anchor.id)}
                          style={styles.foldRow}
                        >
                          <Text style={styles.foldLabel}>
                            {open ? copy.myDay.showLess : copy.myDay.showDone(hidden)}
                          </Text>
                        </Pressable>
                      );
                    })()}
                  </View>
                )}

                {line.kind === 'habit' && cardFor(line.habit)}

                {line.kind === 'now' && (
                  <View style={styles.nowRow}>
                    <View style={styles.nowDot} />
                    <View style={styles.nowLine} />
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function HabitCard({
  habit,
  carried,
  onToggle,
  onEdit,
  onPickUp,
  onHover,
  onDrop,
  onRelease,
}: {
  habit: TodayHabit;
  carried: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onPickUp: () => void;
  onHover: (y: number) => void;
  onDrop: (y: number) => void;
  onRelease: () => void;
}) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const offset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const aimOffset = useRef(0);
  const cardRef = useRef<View>(null);

  // 1 is the open card, 0 is the folded line. Only moves during the moment a
  // habit is checked off; the rest of the time the card simply is one or the
  // other.
  const fold = useRef(new Animated.Value(1)).current;
  const strike = useRef(new Animated.Value(habit.checkedIn ? 1 : 0)).current;
  /** 0 is an empty card, 1 is full to the brim. */
  const rise = useRef(new Animated.Value(0)).current;
  const splash = useRef(new Animated.Value(0)).current;
  const wasChecked = useRef(habit.checkedIn);
  const [celebrating, setCelebrating] = useState(false);
  const [cardH, setCardH] = useState(0);
  const [nameW, setNameW] = useState(0);

  useEffect(() => {
    if (habit.checkedIn === wasChecked.current) return;
    const justDone = habit.checkedIn && !wasChecked.current;
    wasChecked.current = habit.checkedIn;

    // Undoing is a correction, not an achievement. It snaps back.
    if (!justDone) {
      setCelebrating(false);
      fold.setValue(1);
      strike.setValue(0);
      rise.setValue(0);
      splash.setValue(0);
      return;
    }

    setCelebrating(true);
    fold.setValue(1);
    strike.setValue(0);
    rise.setValue(0);
    splash.setValue(0);
    Animated.sequence([
      Animated.parallel([
        // Springs rather than times, so the water arrives with weight and
        // overshoots the brim instead of stopping dead at it.
        Animated.spring(rise, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 10 }),
        Animated.sequence([
          // The droplets leave just before the level lands: they are thrown by
          // the water hitting the top, so they cannot wait for it to settle.
          Animated.delay(RISE_MS * 0.72),
          Animated.timing(splash, { toValue: 1, duration: SPLASH_MS, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(RISE_MS * 0.7),
          Animated.spring(scale, { toValue: 1.04, useNativeDriver: true, speed: 60, bounciness: 16 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 6 }),
        ]),
      ]),
      Animated.delay(BRIM_MS),
      // Height cannot be driven natively, so this one runs on the JS thread.
      // It is one card for a fifth of a second; the water and the droplets,
      // which are the parts you actually watch, stay on the UI thread.
      Animated.timing(fold, { toValue: 0, duration: FOLD_MS, useNativeDriver: false }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setCelebrating(false);
      Animated.timing(strike, {
        toValue: 1,
        duration: STRIKE_MS,
        useNativeDriver: false,
      }).start();
    });
  }, [habit.checkedIn, fold, rise, scale, splash, strike]);

  const measureAim = (fingerY: number) => {
    cardRef.current?.measureInWindow((_x, y, _width, height) => {
      aimOffset.current = y + height / 2 - fingerY;
    });
  };

  const springHome = () => {
    Animated.spring(offset, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  /**
   * runOnJS keeps every callback on the JavaScript thread. The UI-thread path
   * runs through Reanimated's worklets, which segfault inside Expo Go.
   */
  /**
   * The check and the name are Tap gestures rather than Pressables: a
   * GestureDetector claims the touch before React Native's press handling sees
   * it, so a Pressable inside one never fires. Tap loses to Pan only once the
   * long press has held, so a quick tap still lands.
   */
  const tapCard = Gesture.Tap().runOnJS(true).onEnd(() => onToggle());
  const tapEdit = Gesture.Tap().runOnJS(true).onEnd(() => onEdit());

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(220)
    .onStart((event) => {
      measureAim(event.absoluteY);
      Animated.spring(scale, { toValue: 1.03, useNativeDriver: true }).start();
      onPickUp();
    })
    .onUpdate((event) => {
      offset.setValue({ x: event.translationX, y: event.translationY });
      onHover(event.absoluteY + aimOffset.current);
    })
    .onEnd((event) => {
      onDrop(event.absoluteY + aimOffset.current);
    })
    .onFinalize(() => {
      springHome();
      onRelease();
    });

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tapCard)}>
      <Animated.View
        style={{
          transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale }],
          zIndex: carried ? 10 : 0,
        }}
      >
        {/* Outside the clipped wrapper, because the whole point of a droplet is
            that it leaves. */}
        {celebrating && cardH > 0 && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {DROPS.map((drop, index) => (
              <Animated.View
                key={index}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: cardH / 2 - drop.r,
                  width: drop.r * 2,
                  height: drop.r * 2,
                  borderRadius: drop.r,
                  backgroundColor: habit.color,
                  opacity: splash.interpolate({
                    inputRange: [0, 0.12, 1],
                    outputRange: [0, 0.95, 0],
                  }),
                  transform: [
                    {
                      translateX: splash.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, drop.x * 220],
                      }),
                    },
                    {
                      // Out, then back down: a droplet is thrown, not fired.
                      translateY: splash.interpolate({
                        inputRange: [0, 0.55, 1],
                        outputRange: [0, drop.y * cardH, drop.y * cardH * 0.4],
                      }),
                    },
                    {
                      scale: splash.interpolate({
                        inputRange: [0, 0.25, 1],
                        outputRange: [0.4, 1, 0.55],
                      }),
                    },
                  ],
                }}
              />
            ))}
          </View>
        )}

        {celebrating ? (
          /* The moment itself: flooded, brimmed, splashed, then folding away. */
          <Animated.View
            style={{
              height: fold.interpolate({
                inputRange: [0, 1],
                outputRange: [DONE_ROW_H, cardH || DONE_ROW_H],
              }),
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                // Holds its colour for most of the fold and goes near the end,
                // so the card reads as shrinking rather than dissolving.
                opacity: fold.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 1, 1] }),
              }}
            >
              <View
                style={[
                  styles.card,
                  // Clipped, so the water stops at the card instead of running
                  // down the timeline. The droplets live outside this and are
                  // the only thing allowed past the edge.
                  { borderColor: habit.color, overflow: 'hidden' },
                ]}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      transform: [
                        {
                          translateY: rise.interpolate({
                            inputRange: [0, 1],
                            outputRange: [cardH || DONE_ROW_H, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {/* The crest rides the top of the level. Without it the water
                      is a rectangle sliding up, which is a progress bar. */}
                  <View style={styles.wave}>
                    <Svg
                      width="100%"
                      height={WAVE_H}
                      viewBox={`0 0 100 ${WAVE_H}`}
                      preserveAspectRatio="none"
                    >
                      <Path
                        d={`M0 ${WAVE_H} C 10 0, 20 0, 32 ${WAVE_H * 0.55} S 58 ${WAVE_H}, 70 ${WAVE_H * 0.35} S 90 0, 100 ${WAVE_H} Z`}
                        fill={habit.color}
                      />
                    </Svg>
                  </View>
                  <View style={{ flex: 1, backgroundColor: habit.color }} />
                </Animated.View>

                <View style={styles.cardText}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {habit.name}
                  </Text>
                  <Text style={[styles.cardSub, styles.cardSubDone]} numberOfLines={1}>
                    {copy.myDay.solo} · {describeDays(habit.daysOfWeek).toLowerCase()}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        ) : habit.checkedIn ? (
          /**
           * Done gets out of the way.
           *
           * It used to fill with its colour, which made a finished day the
           * loudest thing on the screen — twelve solid cards, nothing left to
           * do, and no way to see that at a glance. The point of this timeline
           * is what is still coming, so a habit that is dealt with shrinks to a
           * line and gives its room back. The strike says done; the stub of
           * colour keeps it findable when you want to undo it.
           *
           * The row stays 44 high even though it only draws about twenty: the
           * thing is still a button, and a button you have to aim at is a worse
           * one. Padding is cheaper than a missed tap.
           */
          <View
            ref={cardRef}
            accessible
            accessibilityRole="button"
            accessibilityState={{ checked: true }}
            accessibilityLabel={copy.today.undoCheckIn}
            style={[styles.doneRow, carried && styles.carried]}
          >
            <View style={[styles.doneStub, { backgroundColor: habit.color }]} />
            <View style={styles.doneNameWrap}>
              <Text
                style={styles.doneName}
                numberOfLines={1}
                onLayout={(event) => setNameW(event.nativeEvent.layout.width)}
              >
                {habit.name}
              </Text>
              {/* Drawn rather than declared, so the line arrives with the fold
                  instead of being there before it finishes. */}
              <Animated.View
                style={[
                  styles.strike,
                  {
                    backgroundColor: colors.textFaint,
                    width: strike.interpolate({ inputRange: [0, 1], outputRange: [0, nameW] }),
                  },
                ]}
              />
            </View>
          </View>
        ) : (
          <View
            ref={cardRef}
            accessible
            accessibilityRole="button"
            accessibilityState={{ checked: false }}
            accessibilityLabel={copy.today.checkInLabel(habit.name)}
            onLayout={(event) => setCardH(event.nativeEvent.layout.height)}
            style={[
              styles.card,
              { borderColor: habit.color, backgroundColor: 'transparent' },
              carried && styles.carried,
            ]}
          >
            <View style={styles.cardText}>
              <Text style={styles.cardName} numberOfLines={1}>
                {habit.name}
              </Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {copy.myDay.solo} · {describeDays(habit.daysOfWeek).toLowerCase()}
              </Text>
            </View>

            {/* The card checks in; editing keeps its own small target. */}
            <GestureDetector gesture={tapEdit}>
              <View
                accessible
                accessibilityRole="button"
                accessibilityLabel={copy.today.editLabel(habit.name)}
                style={styles.cardEdit}
              >
                <LinesIcon size={18} color={colors.textFaint} />
              </View>
            </GestureDetector>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function label(minutes: number): string {
  return formatTimeGutter(
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
  );
}

/** One row per hour; inside it, a line per thing, each with its own time. */
function buildHours(anchors: Anchor[], habits: TodayHabit[], nowMinutes: number): HourRow[] {
  const timed = habits.filter((habit) => habit.mode === 'at' && habit.time);
  const blocks = anchors
    .filter((anchor) => anchor.ends_at !== null)
    .map((anchor) => ({
      anchor,
      start: minutesOf(anchor.usual_time),
      end: minutesOf(anchor.ends_at as string),
    }));

  const marks = [
    ...anchors.map((anchor) => Math.floor(minutesOf(anchor.usual_time) / 60)),
    ...timed.map((habit) => Math.floor(habit.sortKey / 60)),
    Math.floor(nowMinutes / 60),
  ];
  const first = marks.length > 0 ? Math.min(...marks) : 7;
  const last = marks.length > 0 ? Math.max(...marks) : 22;

  const rows: HourRow[] = [];
  for (let hour = first; hour <= last; hour += 1) {
    const start = hour * 60;
    const end = start + 60;

    const moments = anchors
      .filter((anchor) => {
        const at = minutesOf(anchor.usual_time);
        return at >= start && at < end;
      })
      .sort((a, b) => minutesOf(a.usual_time) - minutesOf(b.usual_time));

    // A timed habit belongs to the hour it was set to, block or no block: it
    // was dropped there deliberately. The block's rail runs behind it, which
    // is what shows it happens during work.
    const loose = timed.filter((habit) => habit.sortKey >= start && habit.sortKey < end);

    const lines: Line[] = [];
    // The hour's own tick, unless something already sits on the hour and will
    // print that time itself.
    const onTheHour =
      moments.some((anchor) => minutesOf(anchor.usual_time) === start) ||
      loose.some((habit) => habit.sortKey === start);
    if (!onTheHour) {
      lines.push({ kind: 'hour', time: label(start) });
    }
    for (const anchor of moments) {
      lines.push({
        kind: 'moment',
        time: label(minutesOf(anchor.usual_time)),
        anchor,
        habits: habits.filter((habit) => habit.anchorId === anchor.id),
      });
    }
    for (const habit of loose) {
      lines.push({ kind: 'habit', time: label(habit.sortKey), habit });
    }
    if (Math.floor(nowMinutes / 60) === hour) {
      lines.push({ kind: 'now', time: label(nowMinutes) });
    }

    // Everything in an hour reads in time order, the now line included.
    lines.sort((a, b) => order(a) - order(b));

    rows.push({
      hour,
      lines,
      spans: blocks
        .filter((block) => block.start < end && block.end > start)
        .map((block) => ({ id: block.anchor.id, color: momentColor(block.anchor) })),
    });
  }
  return rows;
}

function order(line: Line): number {
  const [clock, suffix] = line.time.split(' ');
  const [h, m] = (clock ?? '0').split(':').map(Number);
  let hour = h ?? 0;
  if (suffix === 'pm' && hour !== 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  return hour * 60 + (m ?? 0);
}

const makeStyles = (colors: Palette) => ({
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
    paddingBottom: spacing.md,
  },
  hourRow: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingVertical: 6,
    // Without a floor an empty hour collapses to one line, and a busy
    // twenty minutes ends up taller than a quiet afternoon.
    minHeight: HOUR_MIN,
    justifyContent: 'center',
  },
  hovered: { backgroundColor: alpha(habitColors[1], 0.22), borderRadius: radii.card },
  foldRow: { paddingVertical: 8, paddingHorizontal: 4 },
  foldLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textFaint,
  },
  railLayer: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row', gap: 3 },
  span: { width: 4, opacity: 0.9 },
  line: { flexDirection: 'row', minHeight: 30, paddingVertical: 2 },
  // Left-aligned with the same gap the block rail uses, so a moment's tick and
  // a block's rail land in one column rather than two.
  railCell: { alignItems: 'flex-start', justifyContent: 'center', paddingLeft: RAIL_GAP },
  tick: { width: 4, height: 22, borderRadius: 2 },
  gutter: {
    width: GUTTER,
    paddingTop: 3,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'right',
  },
  gutterNow: { fontFamily: fonts.bodyBold, color: habitColors[1] },
  lineBody: { flex: 1, gap: 6, justifyContent: 'center' },
  momentGroup: { gap: 6, borderRadius: radii.card },
  momentLabel: { ...display(19, 21), color: colors.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 2,
  },
  carried: { borderWidth: 2, borderColor: colors.white },
  cardText: { flex: 1, gap: 2 },
  cardName: { ...display(20, 20), color: colors.white },
  cardSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },

  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  doneStub: { width: 14, height: 3, borderRadius: 2, opacity: 0.7 },
  doneNameWrap: { flex: 1, justifyContent: 'center' },
  doneName: {
    alignSelf: 'flex-start',
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textFaint,
  },
  strike: { position: 'absolute', left: 0, top: 10, height: 1 },
  wave: { position: 'absolute', left: 0, right: 0, top: -WAVE_H + 1, height: WAVE_H },
  cardSubDone: { color: 'rgba(255,255,255,0.75)' },
  cardEdit: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nowDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: habitColors[1] },
  nowLine: { flex: 1, height: 1, backgroundColor: habitColors[1] },
}) as const;
