import { Pressable, StyleSheet, Text, View } from 'react-native';

import { copy } from '@/copy';
import { formatTime } from '@/data/defaults';
import type { TodayHabit } from '@/lib/api';
import { colors, display, fonts, radii, spacing } from '@/theme';

type Props = {
  habit: TodayHabit;
  onPress: () => void;
};

/** One tile in the "Up next" row. A done habit goes grey. */
export function UpNextTile({ habit, onPress }: Props) {
  const when =
    habit.mode === 'after' && habit.anchorLabel
      ? habit.anchorLabel
      : habit.mode === 'at' && habit.time
        ? formatTime(habit.time)
        : copy.today.anytime;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}, ${when}${habit.checkedIn ? '. ' + copy.today.done : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: habit.checkedIn ? colors.surfaceRaised : habit.color },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.when}>{when}</Text>
      <Text style={styles.name} numberOfLines={3}>
        {habit.name}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.status}>{habit.checkedIn ? copy.today.done : copy.today.open}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 150,
    flexShrink: 0,
    gap: spacing.sm,
    padding: 14,
    borderRadius: radii.bigCard,
  },
  when: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.white,
    opacity: 0.85,
  },
  name: {
    ...display(26, 25),
    color: colors.white,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  status: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
