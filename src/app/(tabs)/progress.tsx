import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { useDockClearance } from '@/components/Dock';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { AdviceList, WeekAdviceBanner, type AdviceTab } from '@/components/AdviceList';
import { FirstTimeHint } from '@/components/FirstTimeHint';
import { TrendBars } from '@/components/ProgressViews';
import { Display } from '@/components/Screen';
import { useCheckIn, useHabitHistory, useResetHistory } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { localDateString } from '@/lib/dates';
import { ADVICE_DAYS, adviceRange, adviseWeek, splitVerdicts, type Placement } from '@/lib/advice';
import { datesBetween, isDue, shiftDate, statsFor, type HabitStats } from '@/lib/stats';
import { streakOf, type Streak } from '@/lib/streaks';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

/** How far back "over time" looks. Long enough to have a shape, short enough to be this month. */
const TREND_DAYS = 30;
/** Marks in a habit's row. A week reads at a glance; a month is a chart. */
const STRIP_DAYS = 7;

type Row = {
  stats: HabitStats;
  streak: Streak;
  /** The last few due days, oldest first, for the strip. */
  recent: { date: string; done: boolean }[];
  /** True when today is due and already checked in. */
  doneToday: boolean;
};

/**
 * Progress, ordered by what is at stake.
 *
 * It used to be a Day / Week / Month switcher over a percentage, and a reader
 * said it read as information placed on a page rather than a hierarchy. The
 * percentage was the reason: a rate has no stakes, so nothing could be more
 * important than anything else.
 *
 * Streaks give it an order. What is one miss from ending comes first and is the
 * only thing here you can act on; what is running comes next; what has stopped
 * sits quietly at the bottom with a way back in.
 *
 * The three periods are gone rather than rearranged. Today is the dock, on every
 * screen. The week is the strip under each habit — the old heat wall, handed
 * back to the habit it belongs to. The month is the trend at the bottom, which
 * is the only one that was ever really about a period.
 */
export default function ProgressScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const clearance = useDockClearance();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: history = [], refetch, isRefetching } = useHabitHistory(userId);
  const resetHistory = useResetHistory(userId);
  const checkIn = useCheckIn(userId);

  const [tab, setTab] = useState<AdviceTab>('needs-work');
  const [confirming, setConfirming] = useState(false);
  const today = localDateString(new Date());

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  /**
   * Every habit against the advice window, which is the trailing stretch rather
   * than a calendar period — a streak does not restart because a month did.
   */
  const rows = useMemo<Row[]>(() => {
    const span = adviceRange(today);
    return history
      .map((habit) => {
        const stats = statsFor(habit, span.from, span.to, today);
        return {
          stats,
          streak: streakOf(stats.days, today),
          recent: stats.days.slice(-STRIP_DAYS),
          doneToday: stats.days.some((day) => day.date === today && day.done),
        };
      })
      .sort((a, b) => b.streak.days - a.streak.days);
  }, [history, today]);

  const atRisk = rows.filter((row) => row.streak.state === 'at-risk');
  const running = rows.filter((row) => row.streak.state === 'running');
  const cold = rows.filter((row) => row.streak.state === 'cold');
  const longest = running[0];

  const accent = atRisk[0]?.stats.color ?? longest?.stats.color ?? habitColors[0];

  const advice = useMemo(() => {
    const span = adviceRange(today);
    const placements = new Map<string, Placement>(
      history.map((habit) => [
        habit.habitId,
        { mode: habit.mode, anchorLabel: habit.anchorLabel, anchorLoad: habit.anchorLoad },
      ]),
    );
    const over = history.map((habit) => statsFor(habit, span.from, span.to, today));
    return { ...splitVerdicts(over, placements), week: adviseWeek(over) };
  }, [history, today]);

  /** One bar a day: how much of that day's list got done. */
  const trend = useMemo(() => {
    const from = shiftDate(today, -(TREND_DAYS - 1));
    return datesBetween(from, today).map((date) => {
      let due = 0;
      let done = 0;
      for (const habit of history) {
        if (!isDue(habit, date, today)) continue;
        due += 1;
        if (habit.checkedOn.includes(date)) done += 1;
      }
      return { date, rate: due === 0 ? null : done / due };
    });
  }, [history, today]);

  /**
   * Always STRIP_DAYS wide. A habit made on Tuesday has three due days and
   * would otherwise draw a stub next to a full week, which reads as a worse
   * week rather than a shorter history. The padding is blank, not missed.
   */
  const strip = (row: Row) => (
    <View style={styles.strip}>
      {Array.from({ length: STRIP_DAYS - row.recent.length }, (_, i) => (
        <View key={`pad-${i}`} style={styles.mark} />
      ))}
      {row.recent.map((day) => (
        <View
          key={day.date}
          style={[
            styles.mark,
            { backgroundColor: day.done ? row.stats.color : alpha(colors.overlay, 0.14) },
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.root}>
      <Bleed color={accent} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xxl,
          paddingBottom: clearance,
          paddingHorizontal: spacing.xl,
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
        <Display size={56} line={50}>{copy.stats.title}</Display>

        {rows.length === 0 && <Text style={styles.empty}>{copy.stats.empty}</Text>}

        {/* The only thing on this screen you can act on, so it comes first and
            it comes with the action. A run you can still save is a decision
            with a deadline, not a statistic. */}
        {atRisk.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: atRisk[0]?.stats.color }]}>
              {copy.stats.atRisk}
            </Text>
            {atRisk.map((row) => (
              <View
                key={row.stats.habitId}
                style={[styles.riskCard, { borderColor: row.stats.color }]}
              >
                <Display size={26} line={26}>{row.stats.name}</Display>
                <Text style={styles.riskBody}>{copy.stats.atRiskBody(row.streak.days)}</Text>
                {!row.doneToday && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={copy.dock.checkInLabel(row.stats.name)}
                    onPress={() => checkIn.mutate({ habitId: row.stats.habitId })}
                    style={({ pressed }) => [
                      styles.riskAction,
                      { backgroundColor: row.stats.color },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={styles.riskActionText}>{copy.crews.checkIn}</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {/* With nothing at risk the screen opens with the reward instead. */}
        {atRisk.length === 0 && longest && (
          <View style={styles.section}>
            <Text style={styles.label}>{copy.stats.longestRun}</Text>
            <View style={styles.headline}>
              <Display size={68} line={60}>{String(longest.streak.days)}</Display>
              <Text style={styles.headlineUnit}>{copy.stats.dayUnit(longest.streak.days)}</Text>
            </View>
            <Text style={styles.riskBody}>{copy.stats.longestRunOn(longest.stats.name)}</Text>
          </View>
        )}

        {running.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>{copy.stats.running}</Text>
            {running.map((row) => (
              <Pressable
                key={row.stats.habitId}
                accessibilityRole="button"
                accessibilityLabel={`${row.stats.name}. ${copy.stats.runDays(row.streak.days)}`}
                onPress={() =>
                  router.push({ pathname: '/new-habit', params: { id: row.stats.habitId } })
                }
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.bar, { backgroundColor: row.stats.color }]} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {row.stats.name}
                  </Text>
                  {strip(row)}
                </View>
                <Display size={24} line={24}>{String(row.streak.days)}</Display>
              </Pressable>
            ))}
          </View>
        )}

        {running.length === 0 && atRisk.length === 0 && rows.length > 0 && (
          <Text style={styles.empty}>{copy.stats.nothingRunning}</Text>
        )}

        {/* Quiet, and phrased as an offer. Nobody needs a list of their failures
            at full contrast. */}
        {cold.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>{copy.stats.cold}</Text>
            <Text style={styles.riskBody}>{copy.stats.coldBody}</Text>
            {cold.map((row) => (
              <Pressable
                key={row.stats.habitId}
                accessibilityRole="button"
                accessibilityLabel={copy.stats.openHabit(row.stats.name)}
                onPress={() =>
                  router.push({ pathname: '/new-habit', params: { id: row.stats.habitId } })
                }
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.bar, { backgroundColor: alpha(row.stats.color, 0.35) }]} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowNameCold} numberOfLines={1}>
                    {row.stats.name}
                  </Text>
                  {strip(row)}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {rows.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.label}>{copy.stats.overTime}</Text>
              <Text style={styles.labelQuiet}>{copy.stats.lastDays(TREND_DAYS)}</Text>
            </View>
            {/* Neutral on purpose: six habit colours in one aggregate reads as a
                fruit salad, and this view is about the shape, not whose it is. */}
            <TrendBars days={trend} color={alpha(colors.overlay, 0.3)} from="" to="" />
          </View>
        )}

        {rows.length > 0 && (
          <View style={styles.section}>
            <FirstTimeHint id="progress-views">{copy.hints.progressViews}</FirstTimeHint>
            <WeekAdviceBanner advice={advice.week} />
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
          </View>
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

  // Ma: the gap between two ideas is bigger than the gap inside one. An even
  // rhythm everywhere is what made this read as a list of things.
  section: { gap: spacing.md, paddingTop: spacing.xxl },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },

  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  labelQuiet: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },

  headline: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  headlineUnit: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },

  riskCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.bigCard,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  riskBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  riskAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.chip,
  },
  riskActionText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.bg },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  bar: { width: 6, height: 30, borderRadius: 3, flexShrink: 0 },
  rowBody: { flex: 1, gap: 6 },
  rowName: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  rowNameCold: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
  strip: { flexDirection: 'row', gap: 3 },
  mark: { flex: 1, height: 5, borderRadius: 2.5, maxWidth: 22 },

  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    paddingTop: spacing.xl,
  },

  footer: { gap: spacing.md, paddingTop: spacing.xxl },
  storage: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.textFaint },
  confirm: { gap: spacing.sm },
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
