import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { TextButton } from '@/components/Button';
import { HabitCalendar } from '@/components/HabitCalendar';
import { Display } from '@/components/Screen';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { useHabitHistory } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { localDateString } from '@/lib/dates';
import {
  calendarFor,
  periodRange,
  shiftDate,
  statsFor,
  weakestWeekday,
  type StatsWindow,
} from '@/lib/stats';
import { streakOf } from '@/lib/streaks';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/**
 * How far back the weekday breakdown looks, whatever period is on screen.
 *
 * Over one week there is exactly one of each weekday, so a weekday chart is the
 * week strip drawn twice. A pattern needs several of each to exist at all.
 */
const PATTERN_DAYS = 84;
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * One habit's data.
 *
 * The overview answers how you are doing; this answers what to do about one of
 * them. Three numbers, the month it happened in, and the thing the app knows
 * and has never said: which weekday it dies on.
 *
 * byWeekday has been computed since the stats were written and has never been
 * drawn anywhere. For a habit sitting at a quarter, "Wednesdays are where this
 * falls over" is more useful than the quarter is.
 */
export default function HabitStatsScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  // Named "period" rather than "window": window is a global in React Native,
  // and a param that shadows one is a bug waiting for someone to trip on it.
  const { id, period } = useLocalSearchParams<{ id: string; period?: string }>();
  const { session } = useAuth();
  const { data: history = [] } = useHabitHistory(session?.user.id);

  const today = localDateString(new Date());
  // Carried from the overview so stepping in keeps the period you were reading.
  const window: StatsWindow = period === 'day' || period === 'month' ? period : 'week';
  const { from, to } = useMemo(() => periodRange(window, today, 0), [window, today]);

  const habit = history.find((entry) => entry.habitId === id);

  const view = useMemo(() => {
    if (!habit) return null;
    const period = statsFor(habit, from, to, today);
    // The run is read over the habit's whole life, not the period on screen: a
    // streak does not restart because a week did.
    const all = statsFor(habit, habit.createdOn, today, today);
    let best = 0;
    let going = 0;
    for (const day of all.days) {
      going = day.done ? going + 1 : 0;
      if (going > best) best = going;
    }
    return {
      period,
      streak: streakOf(all.days, today),
      best,
      calendar: calendarFor(habit, from, to, today),
      // Its own window, long enough for each weekday to have happened several
      // times. Tied to the period it would say nothing on a week and change
      // meaning when you stepped.
      pattern: statsFor(habit, shiftDate(today, -(PATTERN_DAYS - 1)), today, today).byWeekday,
    };
  }, [habit, from, to, today]);

  if (!habit || !view) {
    return (
      <View style={styles.root}>
        <Bleed color={habitColors[0]} />
        <View style={{ paddingTop: insets.top + spacing.xxl, paddingHorizontal: spacing.xl }}>
          <TextButton label={copy.habitStats.back} onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  /** Null unless one weekday is genuinely, singularly worse. Tested in stats. */
  const worst = weakestWeekday(view.pattern);
  const live = view.pattern.filter((day) => day.due > 0);
  const everyDayKept = live.length > 0 && live.every((day) => day.done === day.due);

  const tile = (label: string, value: string) => (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Display size={28} line={28}>{value}</Display>
    </View>
  );

  return (
    <View style={styles.root}>
      <Bleed color={habit.color} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TextButton label={`‹ ${copy.habitStats.back}`} onPress={() => router.back()} />

        <View style={styles.title}>
          <View style={[styles.spine, { backgroundColor: habit.color }]} />
          <Display size={40} line={36}>{habit.name}</Display>
        </View>

        <View style={styles.tiles}>
          {tile(
            copy.habitStats.done,
            view.period.rate === null ? '—' : `${Math.round(view.period.rate * 100)}%`,
          )}
          {tile(copy.habitStats.run, String(view.streak.days))}
          {tile(copy.habitStats.best, String(view.best))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{copy.habitStats.theDays}</Text>
          {view.period.due === 0 ? (
            <Text style={styles.body}>{copy.habitStats.nothingDue}</Text>
          ) : (
            <HabitCalendar window={window} days={view.calendar} color={habit.color} />
          )}
        </View>

        {/* The one thing on this screen that tells you what to change. */}
        <View style={styles.section}>
          <Text style={styles.label}>{copy.habitStats.whereItFalls}</Text>
          <View style={styles.week}>
            {view.pattern.map((day, i) => {
              const rate = day.due === 0 ? null : day.done / day.due;
              return (
                <View key={i} style={styles.weekCol}>
                  <View style={styles.weekTrack}>
                    <View
                      style={[
                        styles.weekFill,
                        {
                          height: `${Math.round((rate ?? 0) * 100)}%`,
                          backgroundColor: rate === null ? alpha(colors.overlay, 0.1) : habit.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.weekLabel}>{WEEKDAYS[i]}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.body}>
            {everyDayKept
              ? copy.habitStats.everyDayKept
              : worst === null
                ? copy.habitStats.noPattern
                : copy.habitStats.worstDay(
                    WEEKDAY_NAMES[worst.weekday] ?? '',
                    Math.round(worst.rate * 100),
                  )}
          </Text>
        </View>

        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.habitStats.edit}
            onPress={() => router.push({ pathname: '/new-habit', params: { id: habit.habitId } })}
            style={({ pressed }) => [styles.edit, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.editText}>{copy.habitStats.edit}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },

  title: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  spine: { width: 6, height: 40, borderRadius: 3 },

  tiles: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xl },
  tile: {
    flex: 1,
    gap: 2,
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: alpha(colors.overlay, 0.05),
  },
  tileLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },

  section: { gap: spacing.md, paddingTop: spacing.xxl },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },

  week: { flexDirection: 'row', gap: spacing.sm, height: 92 },
  weekCol: { flex: 1, gap: 6 },
  weekTrack: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: alpha(colors.overlay, 0.06),
  },
  weekFill: { width: '100%', borderRadius: 4 },
  weekLabel: {
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textFaint,
  },

  edit: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
}) as const;
