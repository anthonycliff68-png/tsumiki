import { StyleSheet, Text, View } from 'react-native';

import { copy } from '@/copy';
import type { DayState, StatsWindow, WeekBucket } from '@/lib/stats';
import { alpha, colors, fonts, spacing } from '@/theme';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  window: StatsWindow;
  color: string;
  days: { date: string; state: DayState }[];
  weeks: WeekBucket[];
};

/**
 * A habit's history, shaped to the window being looked at. Seven days fit as
 * labelled boxes; thirty want a calendar; a year of boxes is unreadable on a
 * phone, so all time becomes one bar per week.
 */
export function HabitCalendar({ window, color, days, weeks }: Props) {
  if (window === 'week') return <WeekStrip color={color} days={days} />;
  // A trend needs something to trend. One or two bars is not a shape, it is a
  // block, so a short history keeps the day boxes until there is a run of
  // weeks worth drawing.
  if (window === 'month' || weeks.length < 3) return <MonthGrid color={color} days={days} />;
  return <WeeklyTrend color={color} weeks={weeks} />;
}

function cellStyle(state: DayState, color: string) {
  if (state === 'done') return { backgroundColor: color };
  if (state === 'missed') return { borderWidth: 1, borderColor: alpha(color, 0.45) };
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
  // Pad so the first date lands under its own weekday column.
  const lead = first ? weekdayOfDate(first.date) : 0;

  return (
    <View style={styles.month}>
      <View style={styles.monthRow}>
        {LETTERS.map((letter, index) => (
          <Text key={index} style={[styles.letter, styles.monthCell]}>
            {letter}
          </Text>
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

function WeeklyTrend({ color, weeks }: { color: string; weeks: WeekBucket[] }) {
  if (weeks.length === 0) return null;
  return (
    <View style={styles.trend}>
      <View style={styles.bars}>
        {weeks.map((week) => (
          <View key={week.weekStart} style={styles.barCol}>
            <View
              style={[
                styles.bar,
                {
                  height: `${Math.max(4, Math.round((week.rate ?? 0) * 100))}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <Text style={styles.trendLabel}>{copy.stats.perWeek(weeks.length)}</Text>
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
  letter: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textFaint },
  month: { gap: 4 },
  monthRow: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: `${100 / 7}%`, padding: 2, textAlign: 'center' },
  trend: { gap: 6 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 72 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3 },
  trendLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint },
});
