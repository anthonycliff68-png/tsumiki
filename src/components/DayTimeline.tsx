import { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { CheckIcon } from '@/components/icons';
import { copy } from '@/copy';
import { formatTimeGutter } from '@/data/defaults';
import type { TodayHabit } from '@/lib/api';
import type { Anchor } from '@/lib/models';
import { alpha, anchorColor, colors, display, fonts, habitColors, radii, spacing } from '@/theme';

const GUTTER = 58;
const RAIL_GAP = 8;

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
  const nodes = useRef(new Map<string, { node: View; target: DropTarget }>());
  const rects = useRef<{ key: string; top: number; bottom: number; target: DropTarget }[]>([]);

  const [carried, setCarried] = useState<TodayHabit | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

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
              <View style={{ width: railWidth + RAIL_GAP * 2 }} />

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
                        style={[styles.momentLabel, { color: anchorColor(line.anchor.label) }]}
                      >
                        {line.anchor.label}
                      </Text>
                    </Pressable>
                    {line.habits.map(cardFor)}
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
  const offset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const aimOffset = useRef(0);
  const cardRef = useRef<View>(null);

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
    <GestureDetector gesture={pan}>
      <Animated.View
        style={{
          transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale }],
          zIndex: carried ? 10 : 0,
        }}
      >
        <View
          ref={cardRef}
          style={[styles.card, { backgroundColor: habit.color }, carried && styles.carried]}
        >
          <Pressable
            style={styles.cardText}
            accessibilityRole="button"
            accessibilityLabel={copy.today.editLabel(habit.name)}
            onPress={onEdit}
          >
            <Text style={styles.cardName} numberOfLines={1}>
              {habit.name}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {copy.myDay.solo} · {copy.myDay.everyDay}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              habit.checkedIn ? copy.today.undoCheckIn : copy.today.checkInLabel(habit.name)
            }
            onPress={onToggle}
            style={styles.cardCheck}
          >
            {habit.checkedIn ? (
              <View style={styles.doneCircle}>
                <CheckIcon size={16} color={habit.color} strokeWidth={3.4} />
              </View>
            ) : (
              <View style={styles.openCircle} />
            )}
          </Pressable>
        </View>
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

    const loose = timed.filter(
      (habit) =>
        habit.sortKey >= start &&
        habit.sortKey < end &&
        !blocks.some((block) => habit.sortKey >= block.start && habit.sortKey < block.end),
    );

    const lines: Line[] = [];
    // The hour's own tick, unless something already sits on the hour.
    if (!moments.some((anchor) => minutesOf(anchor.usual_time) === start)) {
      lines.push({ kind: 'hour', time: label(start) });
    }
    for (const anchor of moments) {
      const span = blocks.find((block) => block.anchor.id === anchor.id);
      lines.push({
        kind: 'moment',
        time: label(minutesOf(anchor.usual_time)),
        anchor,
        habits: [
          ...habits.filter((habit) => habit.anchorId === anchor.id),
          // A block absorbs the timed habits inside its hours — they are
          // filtered out of the loose list, so they have to land here or they
          // disappear from the day altogether.
          ...(span
            ? timed.filter(
                (habit) =>
                  habit.anchorId !== anchor.id &&
                  habit.sortKey >= span.start &&
                  habit.sortKey < span.end,
              )
            : []),
        ],
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
        .map((block) => ({ id: block.anchor.id, color: anchorColor(block.anchor.label) })),
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

const styles = StyleSheet.create({
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
  },
  hovered: { backgroundColor: alpha(habitColors[1], 0.22), borderRadius: radii.card },
  railLayer: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row', gap: 3 },
  span: { width: 4, opacity: 0.9 },
  line: { flexDirection: 'row', minHeight: 30, paddingVertical: 2 },
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
  momentLabel: { ...display(19, 21) },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 12,
    borderRadius: radii.card,
  },
  carried: { borderWidth: 2, borderColor: colors.white },
  cardText: { flex: 1, gap: 2 },
  cardName: { ...display(20, 20), color: colors.white },
  cardSub: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  cardCheck: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  doneCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  openCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nowDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: habitColors[1] },
  nowLine: { flex: 1, height: 1, backgroundColor: habitColors[1] },
});
