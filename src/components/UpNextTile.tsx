import { Pressable, Text, View } from 'react-native';

import { CheckIcon } from '@/components/icons';
import { useStyles } from '@/lib/appearance';
import { copy } from '@/copy';
import { formatTime } from '@/data/defaults';
import type { TodayHabit } from '@/lib/api';
import { display, fonts, radii, spacing, type Palette } from '@/theme';

type Props = {
  habit: TodayHabit;
  onPress: () => void;
};

/** One tile in the "Up next" row. A done habit goes grey. */
export function UpNextTile({ habit, onPress }: Props) {
  const styles = useStyles(makeStyles);
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
        { backgroundColor: habit.color },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.when}>{when}</Text>
      <Text style={styles.name} numberOfLines={3}>
        {habit.name}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.status}>{habit.checkedIn ? copy.today.done : copy.today.open}</Text>
        {habit.checkedIn && (
          <View style={styles.doneMark}>
            <CheckIcon size={13} color={habit.color} strokeWidth={3.4} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => ({
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
  doneMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
}) as const;
