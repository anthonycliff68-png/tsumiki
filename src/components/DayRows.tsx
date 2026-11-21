// My Day's rows: the habit tier (glass card) and the to-do tier (tinted row),
// and the small pieces they share.
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { DotsIcon } from '@/components/DayParts';
import type { Drag } from '@/components/Lift';
import { WaterRow } from '@/components/Water';
import { copy } from '@/copy';
import type { TodayHabit, Todo } from '@/lib/api';
import { useStyles, useTheme } from '@/lib/appearance';
import { freshIds } from '@/lib/brainDump';
import { addDays, localDateString } from '@/lib/dates';
import { guessEmoji, loud, todoColor } from '@/lib/dayLook';
import type { Anchor } from '@/lib/models';
import { formatLength } from '@/lib/timeline';
import { alpha, fonts, habitColors, momentColor, type Palette } from '@/theme';

/** Below this a block on the timeline has room for its name only. */
const TWO_LINES_H = 50;
/** Dark words on a bright row: they read on every colour loud() makes. */
export const INK = '#1F140F';
/** A row is at least this tall, and grows 1.6 points a minute past it. */
const MIN_ROW_H = 48;
const PER_MIN = 1.6;
/** How tall a row is in the list: longer things take more room. */
export const sized = (minutes: number | null | undefined) => Math.max(MIN_ROW_H, Math.round((minutes ?? 0) * PER_MIN));
/** The water and the finished line: a deeper shade of the same colour, under white words. */
const deep = (hex: string) => loud(hex, 0.5);

/** "30 min", "1h 30m". White on a filled row. */
export function LengthPill({ minutes, onFill = false, onLoud = false }: { minutes: number; onFill?: boolean; onLoud?: boolean }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.pill, onFill && styles.pillOnFill, onLoud && !onFill && styles.pillOnLoud]}>
      <Text style={[styles.pillText, onFill && styles.pillTextOnFill, onLoud && !onFill && styles.pillTextOnLoud]}>
        {minutes < 60 ? `${minutes} min` : formatLength(minutes)}
      </Text>
    </View>
  );
}

/** The faded "…": the one way to edit. Its own tap, inside the row's, so the rest of the row still finishes it. */
export function EditDots({ label, onPress, color }: { label: string; onPress: () => void; color?: string }) {
  const colors = useTheme();
  return (
    <GestureDetector gesture={Gesture.Tap().runOnJS(true).onEnd((_e, ok) => ok && onPress())}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={12}
        onPress={onPress}
        style={{ marginLeft: -2, marginRight: -4, opacity: color ? 1 : 0.6 }}
      >
        <DotsIcon color={color ?? colors.text} />
      </Pressable>
    </GestureDetector>
  );
}

/** The title with its emoji in front. */
export function ItemTitle({
  title,
  emoji,
  size,
  color,
  lines = 1,
  fresh = false,
}: {
  title: string;
  emoji: string;
  size: number;
  color?: string;
  lines?: number;
  fresh?: boolean;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Text numberOfLines={lines} style={[styles.title, { fontSize: size }, color !== undefined && { color }]}>
      {emoji ? <Text style={styles.emoji}>{`${emoji}  `}</Text> : null}
      {title}
      {fresh && <Text style={styles.fresh}> {copy.brainDump.fresh}</Text>}
    </Text>
  );
}

/** A to-do's colour: its moment's when it hangs off one, else one picked from its id. */
export function todoTint(todo: Todo, anchors: readonly Anchor[]): string {
  const anchor = todo.anchorId ? anchors.find((a) => a.id === todo.anchorId) : undefined;
  return anchor ? momentColor(anchor) : todoColor(todo.id, habitColors.slice(0, 6));
}

/** "From yesterday", or "Since Oct 20" when it has been longer. */
export function carriedLabel(day: string, shown: string): string | null {
  if (day >= shown) return null;
  const [y, m, d] = shown.split('-').map(Number);
  if (localDateString(addDays(new Date(y ?? 0, (m ?? 1) - 1, d ?? 1), -1)) === day) return 'From yesterday';
  const [dy, dm, dd] = day.split('-').map(Number);
  return `Since ${new Date(dy ?? 0, (dm ?? 1) - 1, dd ?? 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/** Preview of the ADHD planner spec: how tall, and whether this is the Next row. */
export type RowLook = { scale: number; isNext: boolean; line: string | null; dim: boolean };

type RowProps = {
  drag: Drag;
  onToggle: () => void;
  onEdit: () => void;
  /** Set on a to-scale timeline: exactly this tall. */
  height?: number;
  /** Sharing the width with other lanes: no room for the length pill. */
  narrow?: boolean;
  look?: RowLook;
};

/** A habit: the bigger tier. Glass card, colour bar, its run of days. */
export function HabitItem({ habit, run, drag, onToggle, onEdit, height, narrow = false, look }: RowProps & { habit: TodayHabit; run: number }) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const emoji = guessEmoji(habit.name);
  const block = height !== undefined;
  const roomy = !block || height >= TWO_LINES_H;
  const bright = loud(habit.color);
  return (
    <WaterRow
      done={habit.checkedIn}
      color={deep(habit.color)}
      title={habit.name}
      emoji={emoji}
      pill={habit.minutes ? <LengthPill minutes={habit.minutes} onFill /> : null}
      onToggle={onToggle}
      drag={drag}
      box={[styles.card, { backgroundColor: bright, minHeight: sized(habit.minutes) }, block && styles.cardBlock, look && { minHeight: 48 * look.scale, paddingVertical: 7, opacity: look.dim ? 0.6 : 1 }, look?.isNext && { borderWidth: 2, borderColor: INK }]}
      height={height}
      narrow={narrow}
    >
      {(wet) => (
        <>
          <View style={styles.words}>
            <ItemTitle
              title={habit.name}
              emoji={emoji}
              size={block || look ? 15 : 17}
              color={wet ? colors.white : INK}
              fresh={freshIds.has(habit.id)}
            />
            {look?.line ? <Text style={[styles.nextLine, wet && styles.subWet]}>{look.line}</Text> : roomy && run >= 2 && (
              <Text style={[styles.sub, wet && styles.subWet]}>{copy.myDay.daysInARow(run)}</Text>
            )}
          </View>
          {habit.minutes && !narrow ? <LengthPill minutes={habit.minutes} onFill={wet} onLoud /> : null}
          <EditDots label={`Edit ${habit.name}`} onPress={onEdit} color={wet ? colors.white : INK} />
        </>
      )}
    </WaterRow>
  );
}

/** A to-do: the smaller tier. A row tinted in its colour. */
export function TodoItem({
  todo,
  tint,
  current = false,
  carried,
  drag,
  onToggle,
  onEdit,
  height,
  narrow = false,
  look,
}: RowProps & { todo: Todo; tint: string; current?: boolean; carried: string | null }) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const emoji = guessEmoji(todo.title);
  const roomy = height === undefined || height >= TWO_LINES_H;
  const bright = loud(tint);
  return (
    <WaterRow
      done={todo.done}
      color={deep(tint)}
      title={todo.title}
      emoji={emoji}
      pill={todo.minutes ? <LengthPill minutes={todo.minutes} onFill /> : null}
      onToggle={onToggle}
      drag={drag}
      box={[styles.todo, { backgroundColor: bright, minHeight: sized(todo.minutes) }, current && { borderWidth: 2, borderColor: INK }, look && { minHeight: 60 * look.scale, borderRadius: 16, opacity: look.dim ? 0.6 : 1 }, look?.isNext && { borderWidth: 2, borderColor: INK }]}
      height={height}
      narrow={narrow}
    >
      {(wet) => (
        <>
          <View style={styles.words}>
            <ItemTitle
              title={todo.title}
              emoji={emoji}
              size={look ? 17 : 15}
              color={wet ? colors.white : INK}
              fresh={freshIds.has(todo.id)}
            />
            {look?.line ? <Text style={[styles.nextLine, wet && styles.subWet]}>{look.line}</Text> : null}
            {roomy && carried && <Text style={[styles.sub, wet && styles.subWet]}>{carried}</Text>}
          </View>
          {todo.minutes && !narrow ? <LengthPill minutes={todo.minutes} onFill={wet} onLoud /> : null}
          <EditDots label={`Edit ${todo.title}`} onPress={onEdit} color={wet ? colors.white : INK} />
        </>
      )}
    </WaterRow>
  );
}

const makeStyles = (colors: Palette) =>
  ({
    pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.raised },
    pillOnFill: { backgroundColor: alpha(colors.white, 0.22) },
    pillText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textMuted },
    pillTextOnFill: { color: colors.white },
    pillOnLoud: { backgroundColor: alpha(INK, 0.12) },
    pillTextOnLoud: { color: INK },
    title: { fontFamily: fonts.bodyMedium, color: colors.text },
    emoji: { fontSize: 14, textDecorationLine: 'none' },
    fresh: { fontSize: 13, color: habitColors[4] },
    words: { flex: 1, gap: 2, justifyContent: 'center' },
    sub: { fontFamily: fonts.body, fontSize: 12, color: alpha(INK, 0.7) },
    nextLine: { fontFamily: fonts.bodyMedium, fontSize: 13, color: INK },
    subWet: { color: alpha(colors.white, 0.8) },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 64,
      paddingVertical: 11,
      paddingLeft: 12,
      paddingRight: 14,
      borderRadius: 14,
    },
    cardBlock: { minHeight: 0, paddingVertical: 5, paddingLeft: 8, paddingRight: 8, gap: 8 },
    todo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 40,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 14,
    },
  }) as const;
