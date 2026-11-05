import { Pressable, Text, View } from 'react-native';

import { copy } from '@/copy';
import { useStyles } from '@/lib/appearance';
import { minutesOfDay } from '@/lib/dates';
import { momentFor, sinceWake, type DayMoment, type SetupHabit, type SetupTodo } from '@/lib/onboardingDay';
import { formatLength } from '@/lib/timeline';
import { formatTimeGutter } from '@/lib/times';
import { alpha, fonts, spacing, type Palette } from '@/theme';

type Row = {
  key: string;
  at: number;
  /** Blank for a habit hanging off a moment: the moment above it says when. */
  time?: string;
  emoji: string;
  label: string;
  length?: string;
  /** A habit's colour, on its tile. */
  color?: string;
  onPress?: () => void;
};

const lengthOf = (time: string, endsAt?: string | null) =>
  endsAt ? formatLength(minutesOfDay(endsAt) - minutesOfDay(time)) : undefined;

type Props = {
  day: DayMoment[];
  /** Each sits under the moment it hangs off, or at its own time if it has one. */
  habits?: SetupHabit[];
  onEdit?: (moment: DayMoment) => void;
  onEditHabit?: (habit: SetupHabit) => void;
  /** With a time they join the day. Without one they get a section of their own. */
  todos?: SetupTodo[];
  onEditTodo?: (todo: SetupTodo) => void;
};

/**
 * "Your day", at the bottom of every setup page, filling in as the questions
 * are answered — so the answers are visibly building something.
 */
export function DayPreview({ day, habits = [], onEdit, onEditHabit, todos = [], onEditTodo }: Props) {
  const styles = useStyles(makeStyles);
  const wake = day[0]?.time ?? '07:00';
  // Bed always closes the day, whatever the clock says.
  const placeOf = (m: DayMoment) => (m.key === 'bed' ? 1441 : sinceWake(m.time, wake));

  const rows: Row[] = [
    ...day.map((m) => ({
      key: m.key,
      at: placeOf(m),
      time: m.time,
      emoji: m.emoji,
      label: m.label,
      length: lengthOf(m.time, m.endsAt),
      onPress: onEdit && (() => onEdit(m)),
    })),
    ...habits.map((h) => ({
      key: `habit-${h.id}`,
      at: h.at ? sinceWake(h.at, wake) + 0.5 : placeOf(momentFor(h.after, day)) + 0.5,
      time: h.at ?? momentFor(h.after, day).time,
      emoji: h.emoji,
      label: h.name,
      length: h.minutes ? formatLength(h.minutes) : undefined,
      color: h.color,
      onPress: onEditHabit && (() => onEditHabit(h)),
    })),
    ...todos.filter((t) => t.at).map((t) => todoRow(t, sinceWake(t.at as string, wake) + 0.5)),
  ].sort((a, b) => a.at - b.at);
  const loose = todos.filter((t) => !t.at);

  function todoRow(t: SetupTodo, at: number): Row {
    return {
      key: `todo-${t.id}`,
      at,
      time: t.at,
      emoji: '☑️',
      label: t.title,
      length: t.minutes ? formatLength(t.minutes) : undefined,
      onPress: onEditTodo && (() => onEditTodo(t)),
    };
  }

  const draw = (row: Row) => (
    <Pressable
      key={row.key}
      disabled={!row.onPress}
      accessibilityRole={row.onPress ? 'button' : undefined}
      onPress={row.onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.time}>{row.time ? formatTimeGutter(row.time) : ''}</Text>
      <View style={[styles.tile, row.color ? { backgroundColor: row.color } : null]}>
        <Text style={styles.emoji}>{row.emoji}</Text>
      </View>
      <Text style={[styles.label, row.color ? styles.habit : null]} numberOfLines={1}>
        {row.label}
        {row.length && <Text style={styles.length}>{`  ${row.length}`}</Text>}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>{copy.onboarding.setup.yourDay}</Text>
        {onEdit && <Text style={styles.editHint}>{copy.onboarding.setup.tapToEdit}</Text>}
      </View>
      {rows.map(draw)}
      {loose.length > 0 && <Text style={[styles.eyebrow, styles.section]}>{copy.onboarding.setup.todos.section}</Text>}
      {loose.map((t) => draw(todoRow(t, 0)))}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  ({
    root: {
      gap: 8,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    eyebrow: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: colors.textFaint,
    },
    section: { paddingTop: spacing.sm },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    editHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
    pressed: { opacity: 0.6 },
    time: {
      width: 58,
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textFaint,
      fontVariant: ['tabular-nums'] as ['tabular-nums'],
    },
    tile: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: alpha(colors.overlay, 0.1),
    },
    emoji: { fontSize: 14 },
    label: {
      flexShrink: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.text,
    },
    habit: { fontFamily: fonts.bodyBold },
    length: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  }) as const;
