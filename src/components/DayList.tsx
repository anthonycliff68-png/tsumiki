import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon, EditIcon } from '@/components/icons';
import { copy } from '@/copy';
import { formatTimeGutter } from '@/data/defaults';
import type { TodayHabit } from '@/lib/api';
import { alpha, colors, display, fonts, radii, spacing } from '@/theme';

type Props = {
  habits: TodayHabit[];
  /** Minutes since midnight, or null when looking at another day. */
  nowMinutes: number | null;
  onToggle: (habit: TodayHabit) => void;
  onEdit: (habit: TodayHabit) => void;
};

/**
 * Every habit on the day, in the order the day runs, each one checkable where
 * it stands. Today is the page you glance at, so nothing hides: done, still to
 * come and already missed all sit in the same list.
 */
export function DayList({ habits, nowMinutes, onToggle, onEdit }: Props) {
  return (
    <View style={styles.list}>
      {habits.map((habit) => {
        const missed =
          !habit.checkedIn && nowMinutes !== null && habit.sortKey < nowMinutes;

        return (
          <Pressable
            key={habit.id}
            accessibilityRole="button"
            accessibilityState={{ checked: habit.checkedIn }}
            accessibilityLabel={
              habit.checkedIn ? copy.today.undoCheckIn : copy.today.checkInLabel(habit.name)
            }
            onPress={() => onToggle(habit)}
            style={({ pressed }) => [
              styles.row,
              { borderColor: alpha(habit.color, habit.checkedIn ? 0.9 : 0.45) },
              habit.checkedIn && { backgroundColor: alpha(habit.color, 0.22) },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={[styles.bar, { backgroundColor: habit.color }]} />

            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>
                {habit.name}
              </Text>
              <Text style={styles.when} numberOfLines={1}>
                {whenOf(habit)}
                {missed ? ` · ${copy.today.missed}` : ''}
                {habit.checkedIn ? ` · ${copy.today.doneTag}` : ''}
              </Text>
            </View>

            {/* Tapping the row checks in; editing is the rarer thing, so it
                gets its own small target rather than the whole card. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.today.editLabel(habit.name)}
              onPress={() => onEdit(habit)}
              hitSlop={6}
              style={({ pressed }) => [styles.edit, pressed && { opacity: 0.6 }]}
            >
              <EditIcon size={17} color={colors.textMuted} />
            </Pressable>

            <View style={styles.check}>
              {habit.checkedIn ? (
                <View style={[styles.doneCircle, { backgroundColor: habit.color }]}>
                  <CheckIcon size={16} color={colors.white} strokeWidth={3.4} />
                </View>
              ) : (
                <View style={[styles.openCircle, { borderColor: alpha(habit.color, 0.8) }]} />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function whenOf(habit: TodayHabit): string {
  if (habit.mode === 'after' && habit.anchorLabel) return `After ${habit.anchorLabel.toLowerCase()}`;
  if (habit.mode === 'at' && habit.time) return formatTimeGutter(habit.time);
  return copy.today.anytimeShort;
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingRight: spacing.sm,
    paddingLeft: 0,
    borderRadius: radii.card,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  bar: { width: 5, alignSelf: 'stretch' },
  text: { flex: 1, gap: 2, paddingVertical: 10 },
  name: { ...display(22, 22) },
  when: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  edit: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  check: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  doneCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
});
