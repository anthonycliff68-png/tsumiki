import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { CheckIcon } from '@/components/icons';
import { copy } from '@/copy';
import { formatTimeGutter } from '@/data/defaults';
import type { TodayHabit } from '@/lib/api';
import type { Anchor } from '@/lib/models';
import { alpha, anchorColor, colors, display, fonts, habitColors, radii, spacing } from '@/theme';

/** Every hour gets a row, so the day has a shape even where nothing happens. */
const HOUR_ROW_MIN = 44;
const GUTTER = 58;

export type DropTarget =
  | { kind: 'anchor'; anchorId: string; label: string }
  | { kind: 'hour'; hour: number };

type HourRow = {
  hour: number;
  label: string;
  anchors: { anchor: Anchor; habits: TodayHabit[] }[];
  loose: TodayHabit[];
  isNow: boolean;
  nowLabel: string;
};

type Props = {
  anchors: Anchor[];
  habits: TodayHabit[];
  nowMinutes: number;
  onToggle: (habit: TodayHabit) => void;
  onEditHabit: (habit: TodayHabit) => void;
  onEditAnchor: (anchor: Anchor) => void;
  onMove: (habit: TodayHabit, target: DropTarget) => void;
  /** Stops the page scrolling while a card is in the air. */
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
  // Each droppable's view, so it can be measured in SCREEN coordinates when a
  // drag starts. Layout positions are relative to the parent row, which is not
  // the space a finger reports itself in.
  const nodes = useRef(new Map<string, { node: View; target: DropTarget }>());
  const rects = useRef<{ key: string; top: number; bottom: number; target: DropTarget }[]>([]);

  const [carried, setCarried] = useState<TodayHabit | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const rows = useMemo(
    () => buildHours(anchors, habits, nowMinutes),
    [anchors, habits, nowMinutes],
  );

  const registerTarget = (key: string, target: DropTarget) => (node: View | null) => {
    if (node) nodes.current.set(key, { node, target });
    else nodes.current.delete(key);
  };

  /** Read every target's place on screen. Called once, as a card is lifted. */
  const measureTargets = () => {
    const found: typeof rects.current = [];
    nodes.current.forEach(({ node, target }, key) => {
      node.measureInWindow((_x, y, _width, height) => {
        found.push({ key, top: y, bottom: y + height, target });
        rects.current = found;
      });
    });
  };

  /**
   * The smallest box containing the point. Hour rows cover the whole day so a
   * drop never lands nowhere; a moment sitting inside one is the tighter match
   * and wins.
   */
  const findRect = (y: number) => {
    const hits = rects.current.filter((rect) => y >= rect.top && y < rect.bottom);
    if (hits.length === 0) return undefined;
    return hits.reduce((best, rect) =>
      rect.bottom - rect.top < best.bottom - best.top ? rect : best,
    );
  };

  const hover = (y: number) => {
    const key = findRect(y)?.key ?? null;
    // Only re-render when the finger crosses into a different target.
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

  /** A gesture can be cancelled instead of ending. Never leave a card held. */
  const release = () => {
    setCarried(null);
    setHoveredKey(null);
    onDragChange(false);
  };

  return (
    <View style={styles.timeline}>
      <Text style={styles.hint}>{copy.myDay.dragHint}</Text>

      {rows.map((row) => (
        <View
          key={row.hour}
          ref={registerTarget(`hour-${row.hour}`, { kind: 'hour', hour: row.hour })}
          style={[styles.hourRow, hoveredKey === `hour-${row.hour}` && styles.hovered]}
        >
          <Text style={styles.hourLabel}>{row.label}</Text>

          <View style={styles.hourBody}>

            {row.anchors.map(({ anchor, habits: stacked }) => (
              <View
                key={anchor.id}
                ref={registerTarget(`anchor-${anchor.id}`, {
                  kind: 'anchor',
                  anchorId: anchor.id,
                  label: anchor.label,
                })}
                style={[
                  styles.anchorGroup,
                  hoveredKey === `anchor-${anchor.id}` && styles.hovered,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${anchor.label}, edit`}
                  onPress={() => onEditAnchor(anchor)}
                  style={styles.anchorHead}
                >
                  <Text style={[styles.anchorLabel, { color: anchorColor(anchor.label) }]}>
                    {anchor.label}
                  </Text>
                  {/* The gutter already says the hour; only add minutes past it. */}
                  {anchor.ends_at ? (
                    <Text style={styles.anchorSpan}>
                      {copy.schedule.range(
                        formatTimeGutter(anchor.usual_time),
                        formatTimeGutter(anchor.ends_at),
                      )}
                    </Text>
                  ) : (
                    !anchor.usual_time.startsWith(
                      `${String(row.hour).padStart(2, '0')}:00`,
                    ) && (
                      <Text style={styles.anchorSpan}>
                        {formatTimeGutter(anchor.usual_time)}
                      </Text>
                    )
                  )}
                </Pressable>

                {stacked.map((habit) => (
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
                ))}
              </View>
            ))}

            {row.loose.map((habit) => (
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
            ))}

            {row.isNow && (
              <View style={styles.nowRow}>
                <View style={styles.nowDot} />
                <View style={styles.nowLine} />
                <Text style={styles.nowLabel}>{copy.myDay.now}</Text>
              </View>
            )}
          </View>
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
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const lifted = useSharedValue(0);
  /**
   * How far the card's middle sits from the finger holding it. People aim with
   * the card they can see, not with the fingertip underneath it.
   */
  const aimOffset = useSharedValue(0);
  const cardRef = useRef<View>(null);

  // A press-and-hold lifts the card; a plain drag still scrolls the page.
  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart((event) => {
      lifted.value = withSpring(1);
      runOnJS(measureAim)(event.absoluteY);
      runOnJS(onPickUp)();
    })
    .onUpdate((event) => {
      offsetX.value = event.translationX;
      offsetY.value = event.translationY;
      runOnJS(onHover)(event.absoluteY + aimOffset.value);
    })
    .onEnd((event) => {
      runOnJS(onDrop)(event.absoluteY + aimOffset.value);
    })
    // Runs whether the gesture ended or was cancelled, so the card always
    // springs home and the page always scrolls again.
    .onFinalize(() => {
      offsetX.value = withSpring(0);
      offsetY.value = withSpring(0);
      lifted.value = withSpring(0);
      runOnJS(onRelease)();
    });

  const measureAim = (fingerY: number) => {
    cardRef.current?.measureInWindow((_x, y, _width, height) => {
      aimOffset.value = y + height / 2 - fingerY;
    });
  };

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: 1 + lifted.value * 0.03 },
    ],
    zIndex: lifted.value > 0 ? 10 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>
        <View
          ref={cardRef}
          style={[
            styles.card,
            habit.checkedIn
              ? { backgroundColor: alpha(habit.color, 0.55) }
              : { backgroundColor: habit.color },
            carried && styles.carried,
          ]}
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
              <CheckIcon size={18} color={colors.white} strokeWidth={3} />
            ) : (
              <View style={styles.openCircle} />
            )}
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/** One row per hour, from the first moment of the day to the last. */
function buildHours(anchors: Anchor[], habits: TodayHabit[], nowMinutes: number): HourRow[] {
  const anchorHour = (anchor: Anchor) => Number(anchor.usual_time.split(':')[0] ?? 0);
  const hours = anchors.map(anchorHour);
  const timedHours = habits
    .filter((habit) => habit.mode === 'at' && habit.time)
    .map((habit) => Math.floor(habit.sortKey / 60));

  const all = [...hours, ...timedHours, Math.floor(nowMinutes / 60)];
  const first = all.length > 0 ? Math.min(...all) : 7;
  const last = all.length > 0 ? Math.max(...all) : 22;

  const rows: HourRow[] = [];
  for (let hour = first; hour <= last; hour += 1) {
    const inHour = anchors.filter((anchor) => anchorHour(anchor) === hour);
    rows.push({
      hour,
      label: formatTimeGutter(`${String(hour).padStart(2, '0')}:00`),
      anchors: inHour.map((anchor) => ({
        anchor,
        habits: habits.filter((habit) => habit.anchorId === anchor.id),
      })),
      loose: habits.filter(
        (habit) => habit.mode === 'at' && Math.floor(habit.sortKey / 60) === hour,
      ),
      isNow: Math.floor(nowMinutes / 60) === hour,
      nowLabel: formatTimeGutter(
        `${String(Math.floor(nowMinutes / 60)).padStart(2, '0')}:${String(nowMinutes % 60).padStart(2, '0')}`,
      ),
    });
  }
  return rows;
}

const styles = StyleSheet.create({
  timeline: { gap: 0 },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
    paddingBottom: spacing.md,
  },
  hourRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: HOUR_ROW_MIN,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingVertical: 6,
  },
  hourLabel: {
    width: GUTTER,
    paddingTop: 2,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'right',
  },
  hourBody: { flex: 1, gap: 6, justifyContent: 'center' },
  emptyHour: { minHeight: 28 },
  hovered: { backgroundColor: alpha(habitColors[1], 0.22), borderRadius: radii.card },
  anchorGroup: { gap: 6, borderRadius: radii.card },
  anchorHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, minHeight: 28 },
  anchorLabel: { ...display(19, 21) },
  anchorSpan: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
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
  openCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nowDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: habitColors[1] },
  nowLine: { flex: 1, height: 1, backgroundColor: habitColors[1] },
  nowLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: habitColors[1],
  },
});
