import { Pressable, Text, View } from 'react-native';

import { useStyles } from '@/lib/appearance';
import { copy } from '@/copy';
import { fonts, radii, spacing, type Palette } from '@/theme';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];

type Props = {
  value: number[];
  color: string;
  onChange: (days: number[]) => void;
};

/** Which days a habit runs on. Sunday first, matching the rest of the app. */
export function DayPicker({ value, color, onChange }: Props) {
  const styles = useStyles(makeStyles);
  const toggle = (day: number) =>
    onChange(
      value.includes(day) ? value.filter((each) => each !== day) : [...value, day].sort(),
    );

  return (
    <View style={styles.wrap}>
      <View style={styles.days}>
        {LETTERS.map((letter, day) => {
          const on = value.includes(day);
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={copy.newHabit.dayName(day)}
              onPress={() => toggle(day)}
              style={[styles.day, on && { backgroundColor: color, borderColor: color }]}
            >
              <Text style={[styles.dayText, on && styles.dayTextOn]}>{letter}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.presets}>
        <Preset label={copy.newHabit.everyDay} onPress={() => onChange(EVERY_DAY)} />
        <Preset label={copy.newHabit.weekdays} onPress={() => onChange(WEEKDAYS)} />
        <Preset label={copy.newHabit.weekends} onPress={() => onChange(WEEKENDS)} />
      </View>
    </View>
  );
}

function Preset({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.preset, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.presetText}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => ({
  wrap: { gap: spacing.sm },
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dayText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted },
  dayTextOn: { color: colors.white },
  presets: { flexDirection: 'row', gap: spacing.sm },
  preset: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textMuted },
}) as const;
