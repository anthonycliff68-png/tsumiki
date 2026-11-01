import { Text, View } from 'react-native';

import { copy } from '@/copy';
import { useStyles } from '@/lib/appearance';
import type { DayEvent } from '@/lib/calendar';
import { sinceWake, type DayMoment } from '@/lib/onboardingDay';
import { formatTimeGutter } from '@/lib/times';
import { alpha, fonts, radii, spacing, type Palette } from '@/theme';

export const EVENT_BLUE = '#4A7FD4';

type Row =
  | {
      kind: 'moment';
      key: string;
      at: number;
      time: string;
      emoji: string;
      label: string;
    }
  | {
      kind: 'habit';
      key: string;
      at: number;
      emoji: string;
      label: string;
      color: string;
    }
  | { kind: 'event'; key: string; at: number; time: string; label: string };

type Props = {
  day: DayMoment[];
  /** Shown stacked under the moment it hangs off. */
  habit?: { name: string; emoji: string; color: string; after: string };
  events?: DayEvent[];
};

/**
 * "Your day", at the bottom of every setup page, filling in as the questions
 * are answered — so the answers are visibly building something.
 */
export function DayPreview({ day, habit, events = [] }: Props) {
  const styles = useStyles(makeStyles);
  const wake = day[0]?.time ?? '07:00';

  const rows: Row[] = [];
  day.forEach((m) => {
    // Bed always closes the day, whatever the clock says.
    const at = m.key === 'bed' ? 1441 : sinceWake(m.time, wake);
    rows.push({
      kind: 'moment',
      key: m.key,
      at,
      time: m.time,
      emoji: m.emoji,
      label: m.label,
    });
    if (habit?.after === m.key) {
      rows.push({
        kind: 'habit',
        key: 'habit',
        at: at + 0.5,
        emoji: habit.emoji,
        label: habit.name,
        color: habit.color,
      });
    }
  });
  events.forEach((e) =>
    rows.push({
      kind: 'event',
      key: e.id,
      at: sinceWake(e.start, wake) + 0.1,
      time: e.start,
      label: e.title,
    }),
  );
  rows.sort((a, b) => a.at - b.at);

  return (
    <View style={styles.root}>
      <Text style={styles.eyebrow}>{copy.onboarding.setup.yourDay}</Text>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.time}>{row.kind === 'habit' ? '' : formatTimeGutter(row.time)}</Text>
          {row.kind === 'event' ? (
            <View style={styles.event}>
              <Text style={styles.label} numberOfLines={1}>
                {row.label}
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.tile, row.kind === 'habit' && { backgroundColor: row.color }]}>
                <Text style={styles.emoji}>{row.emoji}</Text>
              </View>
              <Text style={[styles.label, row.kind === 'habit' && styles.habit]} numberOfLines={1}>
                {row.label}
              </Text>
            </>
          )}
        </View>
      ))}
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
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
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
    event: {
      flex: 1,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: radii.card / 3,
      borderLeftWidth: 3,
      borderLeftColor: EVENT_BLUE,
      backgroundColor: alpha(EVENT_BLUE, 0.22),
    },
  }) as const;
