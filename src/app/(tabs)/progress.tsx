import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { useDockClearance } from '@/components/Dock';
import { copy } from '@/copy';
import { HabitCalendar } from '@/components/HabitCalendar';
import { useHabitHistory, useResetHistory } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { localDateString } from '@/lib/dates';
import {
  bestRun,
  calendarFor,
  currentRun,
  overallOf,
  statsFor,
  weeklyFor,
  windowStart,
  type StatsWindow,
} from '@/lib/stats';
import { alpha, colors, display, fonts, habitColors, radii, spacing } from '@/theme';

const WINDOWS: { key: StatsWindow; label: string }[] = [
  { key: 'week', label: copy.stats.week },
  { key: 'month', label: copy.stats.month },
  { key: 'all', label: copy.stats.all },
];

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** "2026-08-24" -> "24 Aug". */
function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** Progress. How often each habit actually gets done. */
export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useDockClearance();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: history = [], refetch, isRefetching } = useHabitHistory(userId);
  const resetHistory = useResetHistory(userId);

  const [window, setWindow] = useState<StatsWindow>('week');
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const today = localDateString();
  // All time has to reach back past the oldest habit to the oldest check-in:
  // a day filled in through the day pills can predate the habit itself.
  const earliest = useMemo(
    () =>
      history.reduce((oldest, habit) => {
        const firstCheck = habit.checkedOn[0];
        const start =
          firstCheck && firstCheck < habit.createdOn ? firstCheck : habit.createdOn;
        return start < oldest ? start : oldest;
      }, today),
    [history, today],
  );

  const from = useMemo(
    () => windowStart(window, today, earliest),
    [window, today, earliest],
  );
  // If a wider window starts no earlier than the week does, there is simply no
  // older history — worth saying, rather than looking like a broken filter.
  const shortestStart = useMemo(() => windowStart('week', today, earliest), [today, earliest]);

  const stats = useMemo(() => {
    return history
      .map((habit) => ({
        ...statsFor(habit, from, today),
        calendar: calendarFor(habit, from, today),
        weeks: weeklyFor(habit, from, today),
      }))
      .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  }, [history, from, today]);

  const overall = useMemo(() => overallOf(stats), [stats]);
  const accent = stats[0]?.color ?? habitColors[0];

  return (
    <View style={styles.root}>
      <Bleed color={accent} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: clearance,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.textMuted}
          />
        }
      >
        <Text style={display(56, 50)}>{copy.stats.title}</Text>

        <View style={styles.windows}>
          {WINDOWS.map((option) => {
            const active = option.key === window;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setWindow(option.key)}
                style={[styles.window, active && styles.windowActive]}
              >
                <Text style={[styles.windowText, active && styles.windowTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.headline}>
          <Text style={[display(64, 58), { color: colors.text }]}>
            {overall.rate === null ? '—' : `${Math.round(overall.rate * 100)}%`}
          </Text>
          <Text style={styles.headlineSub}>
            {overall.rate === null ? copy.stats.noneDue : copy.stats.doneOf(overall.done, overall.due)}
          </Text>
          {/* The window is worth stating: with a short history, a month and a
              week hold the same days, and the numbers matching is honest. */}
          <Text style={styles.range}>
            {copy.stats.covering(shortDate(from), shortDate(today))}
            {window !== 'week' && from >= shortestStart ? ` · ${copy.stats.sameAsWeek}` : ''}
          </Text>
        </View>

        {stats.length === 0 && <Text style={styles.empty}>{copy.stats.empty}</Text>}

        {stats.map((habit) => {
          const open = openId === habit.habitId;
          return (
            <Pressable
              key={habit.habitId}
              accessibilityRole="button"
              accessibilityLabel={habit.name}
              onPress={() => setOpenId(open ? null : habit.habitId)}
              style={styles.habit}
            >
              <View style={styles.habitHead}>
                <Text style={styles.habitName} numberOfLines={1}>
                  {habit.name}
                </Text>
                <Text style={styles.habitRate}>
                  {habit.rate === null ? copy.stats.notYet : `${Math.round(habit.rate * 100)}%`}
                </Text>
              </View>

              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.round((habit.rate ?? 0) * 100)}%`, backgroundColor: habit.color },
                  ]}
                />
              </View>

              <Text style={styles.habitMeta}>
                {copy.stats.doneOf(habit.done, habit.due)} · {copy.stats.run} {currentRun(habit)} ·{' '}
                {copy.stats.best} {bestRun(habit)}
              </Text>

              <View style={styles.calendar}>
                <HabitCalendar
                  window={window}
                  color={habit.color}
                  days={habit.calendar}
                  weeks={habit.weeks}
                />
              </View>

              {open && (
                <View style={styles.detail}>
                  <Text style={styles.label}>{copy.stats.byWeekday}</Text>
                  <View style={styles.weekdays}>
                    {habit.byWeekday.map((day, index) => {
                      const rate = day.due === 0 ? null : day.done / day.due;
                      return (
                        <View key={index} style={styles.weekday}>
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.bar,
                                {
                                  height: `${Math.max(4, Math.round((rate ?? 0) * 100))}%`,
                                  backgroundColor:
                                    rate === null ? colors.hairline : habit.color,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.weekdayLetter}>{WEEKDAY_LETTERS[index]}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.storage}>{copy.stats.storage}</Text>

          {confirming ? (
            <View style={styles.confirm}>
              <Text style={styles.confirmTitle}>{copy.stats.resetTitle}</Text>
              <Text style={styles.storage}>{copy.stats.resetBody}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  resetHistory.mutate(undefined, { onSuccess: () => setConfirming(false) })
                }
                style={({ pressed }) => [styles.danger, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.dangerText}>{copy.stats.resetConfirm}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setConfirming(false)}>
                <Text style={styles.cancel}>{copy.stats.cancel}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setConfirming(true)}>
              <Text style={styles.cancel}>{copy.stats.reset}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  windows: { flexDirection: 'row', gap: spacing.sm },
  window: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  windowActive: { backgroundColor: colors.text, borderColor: colors.text },
  windowText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  windowTextActive: { color: colors.bg },
  headline: { gap: 2 },
  headlineSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  range: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  habit: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.bigCard,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  habitHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  habitName: { flex: 1, ...display(22, 22) },
  habitRate: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textMuted },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)' },
  fill: { height: 8, borderRadius: 4 },
  habitMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  detail: { gap: spacing.sm, paddingTop: spacing.sm },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  weekdays: { flexDirection: 'row', gap: 6, height: 74 },
  weekday: { flex: 1, gap: 4 },
  barTrack: { flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3 },
  weekdayLetter: {
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
  },
  calendar: { paddingTop: spacing.sm },
  footer: { gap: spacing.md, paddingTop: spacing.lg },
  storage: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.textFaint },
  confirm: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  danger: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.chip,
    backgroundColor: habitColors[1],
  },
  dangerText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  cancel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted },
});
