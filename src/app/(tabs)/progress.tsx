import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { useDockClearance } from '@/components/Dock';
import { copy } from '@/copy';
import { useHabitHistory, useResetHistory } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { localDateString } from '@/lib/dates';
import {
  bestRun,
  currentRun,
  overallOf,
  statsFor,
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
  const earliest = useMemo(
    () =>
      history.reduce((oldest, habit) => (habit.createdOn < oldest ? habit.createdOn : oldest), today),
    [history, today],
  );

  const stats = useMemo(() => {
    const from = windowStart(window, today, earliest);
    return history
      .map((habit) => statsFor(habit, from, today))
      .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  }, [history, window, today, earliest]);

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

                  <Text style={styles.label}>{copy.stats.days}</Text>
                  <View style={styles.grid}>
                    {habit.days.map((day) => (
                      <View
                        key={day.date}
                        style={[
                          styles.cell,
                          {
                            backgroundColor: day.done
                              ? habit.color
                              : alpha(colors.white, 0.08),
                          },
                        ]}
                      />
                    ))}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: 14, height: 14, borderRadius: 3 },
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
