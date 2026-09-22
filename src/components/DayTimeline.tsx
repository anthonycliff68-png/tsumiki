import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { alpha, colors, display, fonts, habitColors, radii, spacing } from '@/theme';

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
  // Where each droppable sits, measured as it lays out.
  const targets = useRef<Map<string, { top: number; height: number; target: DropTarget }>>(
    new Map(),
  );
  const [carried, setCarried] = useState<TodayHabit | null>(null);
  const [hovered, setHovered] = useState<DropTarget | null>(null);

  const rows = useMemo(
    () => buildHours(anchors, habits, nowMinutes),
    [anchors, habits, nowMinutes],
  );

  const measure = (key: string, target: DropTarget) => (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    targets.current.set(key, { top: y, height, target });
  };

  const findTarget = (y: number): DropTarget | null => {
    for (const entry of targets.current.values()) {
      if (y >= entry.top && y < entry.top + entry.height) return entry.target;
    }
    return null;
  };

  return (
    <View style={styles.timeline}>
      <Text style={styles.hint}>{copy.myDay.dragHint}</Text>

      {rows.map((row) => (
        <View key={row.hour} style={styles.hourRow}>
          <Text style={styles.hourLabel}>{row.label}</Text>

          <View style={styles.hourBody}>
            {row.anchors.length === 0 && row.loose.length === 0 && (
              <View
                onLayout={measure(`hour-${row.hour}`, { kind: 'hour', hour: row.hour })}
                style={[
                  styles.emptyHour,
                  hovered?.kind === 'hour' && hovered.hour === row.hour && styles.hovered,
                ]}
              />
            )}

            {row.anchors.map(({ anchor, habits: stacked }) => (
              <View
                key={anchor.id}
                onLayout={measure(`anchor-${anchor.id}`, {
                  kind: 'anchor',
                  anchorId: anchor.id,
                  label: anchor.label,
                })}
                style={[
                  styles.anchorGroup,
                  hovered?.kind === 'anchor' &&
                    hovered.anchorId === anchor.id &&
                    styles.hovered,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${anchor.label}, edit`}
                  onPress={() => onEditAnchor(anchor)}
                  style={styles.anchorHead}
                >
                  <View style={styles.node} />
                  <Text style={styles.anchorLabel}>{anchor.label}</Text>
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
                    onPickUp={() => {
                      setCarried(habit);
                      onDragChange(true);
                    }}
                    onHover={(y) => setHovered(findTarget(y))}
                    onDrop={(y) => {
                      const target = findTarget(y);
                      setCarried(null);
                      setHovered(null);
                      onDragChange(false);
                      if (target) onMove(habit, target);
                    }}
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
                onPickUp={() => {
                  setCarried(habit);
                  onDragChange(true);
                }}
                onHover={(y) => setHovered(findTarget(y))}
                onDrop={(y) => {
                  const target = findTarget(y);
                  setCarried(null);
                  setHovered(null);
                  onDragChange(false);
                  if (target) onMove(habit, target);
                }}
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
}: {
  habit: TodayHabit;
  carried: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onPickUp: () => void;
  onHover: (y: number) => void;
  onDrop: (y: number) => void;
}) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const lifted = useSharedValue(0);

  // A press-and-hold lifts the card; a plain drag still scrolls the page.
  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      lifted.value = withSpring(1);
      runOnJS(onPickUp)();
    })
    .onUpdate((event) => {
      offsetX.value = event.translationX;
      offsetY.value = event.translationY;
      runOnJS(onHover)(event.absoluteY);
    })
    .onEnd((event) => {
      runOnJS(onDrop)(event.absoluteY);
      offsetX.value = withSpring(0);
      offsetY.value = withSpring(0);
      lifted.value = withSpring(0);
    });

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
  emptyHour: { minHeight: 28, borderRadius: radii.card },
  hovered: { backgroundColor: alpha(habitColors[1], 0.18) },
  anchorGroup: { gap: 6, borderRadius: radii.card },
  anchorHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 },
  node: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: colors.textFaint },
  anchorLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
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
