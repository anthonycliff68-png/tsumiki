import { StyleSheet, Text, View } from 'react-native';

import type { DayState, StatsWindow } from '@/lib/stats';
import { alpha, colors, fonts } from '@/theme';

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

function cellStyle(state: DayState, color: string) {
  if (state === 'done') return { backgroundColor: color };
  if (state === 'missed') return { borderWidth: 1, borderColor: alpha(color, 0.5) };
  if (state === 'future') return { borderWidth: 1, borderColor: alpha(colors.white, 0.1) };
  return { backgroundColor: alpha(colors.white, 0.05) };
}

function WeekStrip({ color, days }: { color: string; days: Props['days'] }) {
  return (
    <View style={styles.week}>
      {days.map((day) => (
        <View key={day.date} style={styles.weekCol}>
          <View style={[styles.cell, cellStyle(day.state, color)]} />
          <Text style={styles.letter}>{LETTERS[weekdayOfDate(day.date)]}</Text>
        </View>
      ))}
    </View>
  );
}

function MonthGrid({ color, days }: { color: string; days: Props['days'] }) {
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
            <View style={[styles.cell, cellStyle(day.state, color)]} />
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

const styles = StyleSheet.create({
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
});
