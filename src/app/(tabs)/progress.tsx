import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { useDockClearance } from '@/components/Dock';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { WeekAdviceBanner } from '@/components/AdviceList';
import { FirstTimeHint } from '@/components/FirstTimeHint';
import { Display } from '@/components/Screen';
import { useHabitHistory, useResetHistory } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { localDateString } from '@/lib/dates';
import { adviceRange, adviseWeek, splitVerdicts, type Placement } from '@/lib/advice';
import { overallOf, periodRange, statsFor, type HabitStats, type StatsWindow } from '@/lib/stats';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const WINDOWS: { key: StatsWindow; label: string }[] = [
  { key: 'day', label: copy.stats.day },
  { key: 'week', label: copy.stats.week },
  { key: 'month', label: copy.stats.month },
];

/**
 * How many habits can be named before the list stops being a picture.
 *
 * Under this, every habit gets a row and the screen still answers "how am I
 * doing" at a glance. Over it, the rows fill the screen and answer nothing — so
 * the spread is drawn instead and only the ones worth acting on are named.
 */
const NAME_LIMIT = 8;
/** Below this a habit is slipping. */
const SLIPPING = 0.25;
/** Above this it is fine. Only used to describe the spread in a sentence. */
const FINE = 0.5;

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

function shortDate(date: string): string {
  return asUtc(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

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

/**
 * Progress: how you are doing, and then which habit to look at.
 *
 * The screen answers one question — how often is this actually getting done —
 * and the rate answers it. Everything under that is a way into a single habit
 * rather than a second attempt at the same answer.
 *
 * Habits are bars, sorted weakest first. That does the job the old "needs work
 * / going well" tabs did without a control to operate: the one to look at is
 * the one at the top, where the eye already is.
 *
 * Horizontal rather than vertical, because names need room. Eight vertical bars
 * on a phone is forty points each, which fits no word anyone would use.
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

  const [window, setWindow] = useState<StatsWindow>('week');
  const [offset, setOffset] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const today = localDateString(new Date());

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const earliest = useMemo(
    () =>
      history.reduce((oldest, habit) => {
        const first = habit.checkedOn[0];
        const start = first && first < habit.createdOn ? first : habit.createdOn;
        return start < oldest ? start : oldest;
      }, today),
    [history, today],
  );

  const { from, to } = useMemo(() => periodRange(window, today, offset), [window, today, offset]);
  const canGoBack = from > earliest;
  const canGoForward = offset > 0;

  /** Weakest first. Habits with nothing due sort last: they have no rate to rank. */
  const stats = useMemo<HabitStats[]>(
    () =>
      history
        .map((habit) => statsFor(habit, from, to, today))
        .sort((a, b) => (a.rate ?? 2) - (b.rate ?? 2)),
    [history, from, to, today],
  );

  const overall = useMemo(() => overallOf(stats), [stats]);
  const rated = stats.filter((habit) => habit.rate !== null);
  const slipping = rated.filter((habit) => (habit.rate ?? 0) < SLIPPING);
  const fine = rated.filter((habit) => (habit.rate ?? 0) >= FINE);
  const crowded = rated.length > NAME_LIMIT;

  /** Under the limit every habit is named; over it, only the ones to act on. */
  const named = crowded ? slipping : rated;
  const accent = stats[0]?.color ?? habitColors[0];

  const advice = useMemo(() => {
    const span = adviceRange(to);
    const placements = new Map<string, Placement>(
      history.map((habit) => [
        habit.habitId,
        { mode: habit.mode, anchorLabel: habit.anchorLabel, anchorLoad: habit.anchorLoad },
      ]),
    );
    const over = history.map((habit) => statsFor(habit, span.from, span.to, today));
    return { ...splitVerdicts(over, placements), week: adviseWeek(over) };
  }, [history, to, today]);

  const bar = (habit: HabitStats) => (
    <Pressable
      key={habit.habitId}
      accessibilityRole="button"
      accessibilityLabel={`${copy.stats.openStats(habit.name)}. ${
        habit.rate === null ? copy.stats.noneDue : `${Math.round(habit.rate * 100)}%`
      }`}
      // The period travels with you, so stepping into a habit shows the same
      // stretch you were just reading about.
      onPress={() =>
        router.push({ pathname: '/habit/[id]', params: { id: habit.habitId, period: window } })
      }
      style={({ pressed }) => [styles.barRow, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.barName} numberOfLines={1}>
        {habit.name}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round((habit.rate ?? 0) * 100)}%`, backgroundColor: habit.color },
          ]}
        />
      </View>
      <Text style={styles.barValue}>
        {habit.rate === null ? '—' : `${Math.round(habit.rate * 100)}%`}
      </Text>
    </Pressable>
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

        <View style={styles.windows}>
          {WINDOWS.map((option) => {
            const active = option.key === window;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setWindow(option.key);
                  setOffset(0);
                }}
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
          <Display size={64} line={58}>
            {overall.rate === null ? '—' : `${Math.round(overall.rate * 100)}%`}
          </Display>
          <Text style={styles.headlineSub}>
            {overall.rate === null
              ? copy.stats.nothingHere
              : `${copy.stats.doneOf(overall.done, overall.due)} · ${copy.stats.covering(
                  shortDate(from),
                  shortDate(to),
                )}`}
          </Text>
        </View>

        {stats.length === 0 && <Text style={styles.empty}>{copy.stats.empty}</Text>}

        {/* Past the naming limit the rows would fill the screen and stop being a
            picture, so the spread is drawn instead: one tick a habit, low to
            high. It answers "where does everything sit" without asking anyone
            to read thirty names. */}
        {crowded && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.label}>{copy.stats.allOf(rated.length)}</Text>
              <Text style={styles.labelQuiet}>{copy.stats.lowToHigh}</Text>
            </View>
            <View style={styles.spread}>
              {rated.map((habit) => (
                <View
                  key={habit.habitId}
                  style={[
                    styles.tick,
                    {
                      height: `${Math.max(Math.round((habit.rate ?? 0) * 100), 4)}%`,
                      backgroundColor: habit.color,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.labelQuiet}>{copy.stats.spread(slipping.length, fine.length)}</Text>
          </View>
        )}

        {named.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={[styles.label, crowded && { color: slipping[0]?.color }]}>
                {crowded ? copy.stats.slipping(slipping.length) : copy.stats.eachHabit}
              </Text>
              {!crowded && <Text style={styles.labelQuiet}>{copy.stats.weakestFirst}</Text>}
            </View>
            {named.map(bar)}
            {crowded && <Text style={styles.seeAll}>{copy.stats.seeAll(rated.length)}</Text>}
          </View>
        )}

        {crowded && slipping.length === 0 && (
          <Text style={styles.empty}>{copy.stats.allFine}</Text>
        )}

        {stats.length > 0 && (
          <View style={styles.section}>
            <FirstTimeHint id="progress-views">{copy.hints.progressViews}</FirstTimeHint>
            <WeekAdviceBanner advice={advice.week} />
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

  windows: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.lg },
  window: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  windowActive: { backgroundColor: colors.text, borderColor: colors.text },
  windowText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted },
  windowTextActive: { color: colors.bg },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
  },
  step: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepOff: { opacity: 0.3 },
  stepText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },
  period: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },

  headline: { gap: 4, paddingTop: spacing.xl },
  headlineSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  // Ma: a bigger gap between sections than inside one, so the screen reads as
  // parts rather than as a column of things.
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

  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  barName: { width: 96, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  track: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: alpha(colors.overlay, 0.08),
  },
  fill: { height: '100%', borderRadius: 4 },
  barValue: {
    width: 38,
    textAlign: 'right',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },

  spread: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 44 },
  tick: { flex: 1, borderRadius: 1 },
  seeAll: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textMuted,
    paddingTop: spacing.xs,
  },

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
