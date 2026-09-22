import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon, FlameIcon } from '@/components/icons';
import { copy } from '@/copy';
import type { TodayHabit } from '@/lib/api';
import { formatTime } from '@/data/defaults';
import { alpha, colors, display, fonts, radii, spacing } from '@/theme';

type Props = {
  habit: TodayHabit;
  /** Crew name and streak, once the habit belongs to one. */
  crewName?: string | null;
  streakDays?: number | null;
  busy?: boolean;
  onCheckIn: () => void;
  onUndo: () => void;
  /** Tapping the habit's name opens it for editing. */
  onEdit?: () => void;
};

/** The big card on Today: the one habit that is up next. Artboard: TodayDark. */
export function HeroCard({ habit, crewName, streakDays, busy, onCheckIn, onUndo, onEdit }: Props) {
  const when =
    habit.mode === 'after' && habit.anchorLabel
      ? habit.anchorLabel
      : habit.mode === 'at' && habit.time
        ? formatTime(habit.time)
        : copy.today.anytime;

  return (
    <View style={[styles.card, { backgroundColor: habit.color, boxShadow: `0px 24px 60px ${alpha(habit.color, 0.45)}` }]}>
      <View style={styles.chips}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{when}</Text>
        </View>
        {typeof streakDays === 'number' && streakDays > 0 && (
          <View style={styles.chip}>
            <FlameIcon size={14} color={colors.white} />
            <Text style={styles.chipText}>{copy.today.streakDays(streakDays)}</Text>
          </View>
        )}
      </View>

      <Text
        style={styles.name}
        accessibilityRole={onEdit ? 'button' : 'text'}
        accessibilityLabel={onEdit ? copy.today.editLabel(habit.name) : undefined}
        onPress={onEdit}
      >
        {habit.name}
      </Text>

      {crewName && <Text style={styles.crew}>{crewName}</Text>}

      {habit.checkedIn ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.today.undoCheckIn}
          onPress={onUndo}
          style={({ pressed }) => [styles.button, styles.buttonDone, pressed && styles.pressed]}
        >
          <CheckIcon size={22} color={colors.success} strokeWidth={2.6} />
          <Text style={[styles.buttonText, { color: colors.success }]}>{copy.today.checkedIn}</Text>
          <Text style={styles.undoHint}>{copy.today.undo}</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.today.checkInLabel(habit.name)}
          disabled={busy}
          onPress={onCheckIn}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <CheckIcon size={22} color={colors.white} strokeWidth={2.6} />
              <Text style={styles.buttonText}>{copy.today.checkIn}</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.hero,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.white,
  },
  name: {
    ...display(56, 48),
    color: colors.white,
  },
  crew: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.white,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
    borderRadius: radii.chip,
    backgroundColor: colors.bg,
  },
  buttonDone: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.white,
  },
  undoHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  pressed: {
    opacity: 0.85,
  },
});
