import { Text, View } from 'react-native';

import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import type { DayState, StatsWindow } from '@/lib/stats';
import { alpha, fonts, type Palette } from '@/theme';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  window: StatsWindow;
  color: string;
  days: { date: string; state: DayState }[];
};

/**
 * A habit's history for the period on screen. A week is seven labelled boxes
 * running Sunday to Saturday; a month is a real calendar. A single day needs
 * no calendar at all — the card already says whether it was done.
 */
export function HabitCalendar({ window, color, days }: Props) {
  if (window === 'day') return null;
  if (window === 'week') return <WeekStrip color={color} days={days} />;
  return <MonthGrid color={color} days={days} />;
}

/**
 * Four states that have to be told apart at a glance, in this order of
 * loudness: done, missed, future, not due. A miss is the thing worth
 * noticing, so it is drawn — a tinted box with a hard edge — rather than
 * left as an absence. A day still to come is dashed, and a day the habit
 * was never scheduled for recedes into the card.
 */
function cellStyle(state: DayState, color: string, colors: Palette) {
  if (state === 'done') return { backgroundColor: color };
  if (state === 'missed') {
    return {
      backgroundColor: alpha(color, 0.18),
      borderWidth: 1.5,
      borderColor: alpha(color, 0.9),
    };
  }
  if (state === 'future') {
    return {
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      borderColor: alpha(colors.overlay, 0.16),
    };
  }
  return { backgroundColor: alpha(colors.overlay, 0.04) };
}

/** Says what the four cell treatments mean, once per screen. */
export function CalendarLegend({ color }: { color: string }) {
  const colors = useTheme();
  const styles = useStyles(makeStyles);
  const keys: { state: DayState; label: string }[] = [
    { state: 'done', label: copy.stats.legend.done },
    { state: 'missed', label: copy.stats.legend.missed },
    { state: 'future', label: copy.stats.legend.future },
    { state: 'not-due', label: copy.stats.legend.notDue },
  ];
  return (
    <View style={styles.legend}>
      {keys.map((key) => (
        <View key={key.state} style={styles.legendKey}>
          <View style={[styles.legendCell, cellStyle(key.state, color, colors)]} />
          <Text style={styles.legendLabel}>{key.label}</Text>
        </View>
      ))}
    </View>
  );
}

function WeekStrip({ color, days }: { color: string; days: Props['days'] }) {
  const colors = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.week}>
      {days.map((day) => (
        <View key={day.date} style={styles.weekCol}>
          <View style={[styles.cell, cellStyle(day.state, color, colors)]} />
          <Text style={styles.letter}>{LETTERS[weekdayOfDate(day.date)]}</Text>
        </View>
      ))}
    </View>
  );
}

function MonthGrid({ color, days }: { color: string; days: Props['days'] }) {
  const colors = useTheme();
  const styles = useStyles(makeStyles);
  const first = days[0];
  // Pad so the first of the month lands under its own weekday column.
  const lead = first ? weekdayOfDate(first.date) : 0;

  return (
    <View style={styles.month}>
      <View style={styles.monthRow}>
        {LETTERS.map((letter, index) => (
          <View key={index} style={styles.monthCell}>
            <Text style={styles.letter}>{letter}</Text>
          </View>
        ))}
      </View>
      <View style={styles.monthRow}>
        {Array.from({ length: lead }, (_, index) => (
          <View key={`pad-${index}`} style={styles.monthCell} />
        ))}
        {days.map((day) => (
          <View key={day.date} style={styles.monthCell}>
            <View style={[styles.cell, cellStyle(day.state, color, colors)]} />
          </View>
        ))}
      </View>
    </View>
  );
}

function weekdayOfDate(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

const makeStyles = (colors: Palette) => ({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  legendKey: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  week: { flexDirection: 'row', gap: 5 },
  weekCol: { flex: 1, gap: 4, alignItems: 'center' },
  cell: { width: '100%', aspectRatio: 1, borderRadius: 4, minWidth: 12 },
  letter: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    textAlign: 'center',
  },
  month: { gap: 4 },
  monthRow: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: `${100 / 7}%`, padding: 2 },
}) as const;
