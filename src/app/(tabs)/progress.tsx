import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { useDockClearance } from '@/components/Dock';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { AdviceList, type AdviceTab } from '@/components/AdviceList';
import { CalendarLegend } from '@/components/HabitCalendar';
import { HeatWall, RingGrid, TrendBars, type HeatCell } from '@/components/ProgressViews';
import { useHabitHistory, useResetHistory } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { localDateString } from '@/lib/dates';
import { ADVICE_DAYS, adviceRange, splitVerdicts, type Placement } from '@/lib/advice';
import {
  calendarFor,
  currentRun,
  datesBetween,
  isDue,
  overallOf,
  periodRange,
  statsFor,
  type StatsWindow,
} from '@/lib/stats';
import { alpha, display, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const WINDOWS: { key: StatsWindow; label: string }[] = [
  { key: 'day', label: copy.stats.day },
  { key: 'week', label: copy.stats.week },
  { key: 'month', label: copy.stats.month },
];

/** What to call the period on screen. */
function periodLabel(window: StatsWindow, offset: number, from: string, to: string): string {
  if (offset === 0) {
    if (window === 'day') return copy.stats.today;
    if (window === 'week') return copy.stats.thisWeek;
    return copy.stats.thisMonth;
  }
  if (window === 'day') return longDate(from);
  if (window === 'month') return monthLabel(from);
  return `${shortDate(from)} – ${shortDate(to)}`;
}

function asUtc(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

function longDate(date: string): string {
  return asUtc(date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function monthLabel(date: string): string {
  return asUtc(date).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

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
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const clearance = useDockClearance();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: history = [], refetch, isRefetching } = useHabitHistory(userId);
  const resetHistory = useResetHistory(userId);

  const [window, setWindow] = useState<StatsWindow>('week');
  /** How many periods back from the current one we are looking. */
  const [offset, setOffset] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [tab, setTab] = useState<AdviceTab>('needs-work');

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const today = localDateString();
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

  const { from, to } = useMemo(
    () => periodRange(window, today, offset),
    [window, today, offset],
  );

  // Stepping back stops where the history does; there is no forward past today.
  const canGoBack = from > earliest;
  const canGoForward = offset > 0;

  const stats = useMemo(() => {
    return history
      .map((habit) => ({
        ...statsFor(habit, from, to, today),
        calendar: calendarFor(habit, from, to, today),
      }))
      .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  }, [history, from, to, today]);

  const overall = useMemo(() => overallOf(stats), [stats]);
  const accent = stats[0]?.color ?? habitColors[0];

  // Advice reads its own trailing stretch, ending where the period on screen
  // ends, so stepping back through history still tells you what was slipping
  // then — and a single day never decides which habit needs work.
  const advice = useMemo(() => {
    const span = adviceRange(to);
    const placements = new Map<string, Placement>(
      history.map((habit) => [
        habit.habitId,
        { mode: habit.mode, anchorLabel: habit.anchorLabel, anchorLoad: habit.anchorLoad },
      ]),
    );
    const over = history.map((habit) => statsFor(habit, span.from, span.to, today));
    return { ...splitVerdicts(over, placements), byHabit: new Map(over.map((h) => [h.habitId, h])) };
  }, [history, to, today]);

  /** Day: a ring per habit, filled by how it has been going lately. */
  const ringData = useMemo(
    () =>
      stats.map((habit) => {
        const recent = advice.byHabit.get(habit.habitId);
        return {
          stats: habit,
          run: recent ? currentRun(recent) : 0,
          recent: recent?.rate ?? null,
        };
      }),
    [stats, advice],
  );

  /** Week: seven marks a habit, weakest habit on top. */
  const wallData = useMemo(
    () =>
      stats
        .slice()
        .sort((a, b) => (a.rate ?? 2) - (b.rate ?? 2))
        .map((habit) => ({ stats: habit, cells: habit.calendar as HeatCell[] })),
    [stats],
  );

  /** Month: one bar a day, how much of that day's list got done. */
  const trendData = useMemo(() => {
    if (window !== 'month') return [];
    return datesBetween(from, to).map((date) => {
      let due = 0;
      let done = 0;
      for (const habit of history) {
        if (!isDue(habit, date, today)) continue;
        due += 1;
        if (habit.checkedOn.includes(date)) done += 1;
      }
      return { date, rate: due === 0 ? null : done / due };
    });
  }, [window, from, to, history, today]);

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

        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.stats.earlier}
            accessibilityState={{ disabled: !canGoBack }}
            disabled={!canGoBack}
            onPress={() => setOffset((current) => current + 1)}
            style={[styles.step, !canGoBack && styles.stepOff]}
          >
            <Text style={styles.stepText}>‹</Text>
          </Pressable>

          <Text style={styles.period}>{periodLabel(window, offset, from, to)}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.stats.later}
            accessibilityState={{ disabled: !canGoForward }}
            disabled={!canGoForward}
            onPress={() => setOffset((current) => Math.max(0, current - 1))}
            style={[styles.step, !canGoForward && styles.stepOff]}
          >
            <Text style={styles.stepText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.headline}>
          <Text style={[display(64, 58), { color: colors.text }]}>
            {overall.rate === null ? '—' : `${Math.round(overall.rate * 100)}%`}
          </Text>
          <Text style={styles.headlineSub}>
            {overall.rate === null
              ? copy.stats.nothingHere
              : copy.stats.doneOf(overall.done, overall.due)}
          </Text>
          <Text style={styles.range}>{copy.stats.covering(shortDate(from), shortDate(to))}</Text>
          {window === 'week' && <CalendarLegend color={colors.text} />}
        </View>

        {stats.length === 0 && <Text style={styles.empty}>{copy.stats.empty}</Text>}

        {stats.length > 0 && (
          <View style={styles.view}>
            {window === 'day' && <RingGrid habits={ringData} />}
            {window === 'week' && <HeatWall habits={wallData} />}
            {window === 'month' && (
              <TrendBars
                days={trendData}
                color={accent}
                from={shortDate(from)}
                to={shortDate(to)}
              />
            )}
          </View>
        )}

        {stats.length > 0 && (
          <AdviceList
            tab={tab}
            onTab={setTab}
            needsWork={advice.needsWork}
            goingWell={advice.goingWell}
            windowDays={ADVICE_DAYS}
            onOpen={(habitId) =>
              router.push({ pathname: '/new-habit', params: { id: habitId } })
            }
          />
        )}

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

const makeStyles = (colors: Palette) => ({
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
  view: { marginTop: 24 },
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
  calendar: { paddingTop: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepOff: { opacity: 0.3 },
  stepText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },
  period: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
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
}) as const;
