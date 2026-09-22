import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EditIcon } from '@/components/icons';
import { copy } from '@/copy';
import { describeDays, formatTimeGutter } from '@/data/defaults';
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
              {
                borderColor: habit.color,
                // Empty until it is done, then the whole bar fills.
                backgroundColor: habit.checkedIn ? habit.color : 'transparent',
              },
              pressed && { opacity: 0.85 },
            ]}
          >

            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>
                {habit.name}
              </Text>
              <Text
                style={[styles.when, habit.checkedIn && styles.whenDone]}
                numberOfLines={1}
              >
                {whenOf(habit)}
                {habit.daysOfWeek.length < 7 ? ` · ${describeDays(habit.daysOfWeek)}` : ''}
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
              hitSlop={8}
              style={({ pressed }) => [
                styles.edit,
                {
                  borderColor: habit.checkedIn ? 'rgba(255,255,255,0.45)' : colors.border,
                },
                pressed && { opacity: 0.6 },
              ]}
            >
              <EditIcon
                size={16}
                color={habit.checkedIn ? colors.white : colors.textMuted}
              />
            </Pressable>
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
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 2,
  },
  text: { flex: 1, gap: 2, paddingVertical: 10 },
  name: { ...display(22, 22) },
  when: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  whenDone: { color: 'rgba(255,255,255,0.8)' },
  edit: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
  },
});
