import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { useDockClearance } from '@/components/Dock';
import { CheckIcon } from '@/components/icons';
import { copy } from '@/copy';
import { formatTimeShort } from '@/data/defaults';
import { useAnchors, useCheckIn, useToday, type TodayHabit } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { minutesOfDay } from '@/lib/dates';
import type { Anchor } from '@/lib/models';
import { alpha, colors, display, fonts, habitColors, radii, spacing } from '@/theme';

/** A gap worth offering to fill, in minutes. */
const FREE_GAP = 120;

type Row =
  | { kind: 'anchor'; key: string; minutes: number; label: string; habits: TodayHabit[] }
  | { kind: 'habit'; key: string; minutes: number; habit: TodayHabit }
  | { kind: 'now'; key: string; minutes: number }
  | { kind: 'free'; key: string; minutes: number; hours: number }
  | { kind: 'anytime'; key: string; minutes: number; habits: TodayHabit[] };

/** My Day. Artboard: MyDay. */
export default function MyDayScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useDockClearance();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: anchors = [] } = useAnchors(userId);
  const { data: habits = [], refetch, isRefetching } = useToday(userId);
  const checkIn = useCheckIn(userId);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const rows = useMemo(() => buildDay(anchors, habits, nowMinutes), [anchors, habits, nowMinutes]);

  const stacked = habits.filter((h) => h.mode === 'after').length;
  const timed = habits.filter((h) => h.mode === 'at').length;
  const heroColor = habits.find((h) => !h.checkedIn)?.color ?? habitColors[0];

  return (
    <View style={styles.root}>
      <Bleed color={heroColor} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: clearance,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.textMuted} />
        }
      >
        <View style={styles.topRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <Text
            style={[styles.pillText, styles.link]}
            onPress={() => router.push('/routine')}
            accessibilityRole="button"
          >
            {copy.myDay.editRoutine}
          </Text>
        </View>

        <View style={styles.header}>
          <Text style={display(56, 48)}>{copy.myDay.title}</Text>
          <View style={styles.counts}>
            <Text style={[display(24, 24), { color: colors.textMuted }]}>
              {copy.myDay.habitCount(habits.length)}
            </Text>
            <Text style={styles.countsSub}>{copy.myDay.breakdown(stacked, timed)}</Text>
          </View>
        </View>

        {anchors.length === 0 && <Text style={styles.empty}>{copy.myDay.empty}</Text>}

        <View style={styles.timeline}>{rows.map((row) => renderRow(row, checkIn))}</View>
      </ScrollView>
    </View>
  );
}

/** Anchors, their stacked habits, timed habits, the NOW line and the gaps. */
function buildDay(anchors: Anchor[], habits: TodayHabit[], nowMinutes: number): Row[] {
  const rows: Row[] = [];

  for (const anchor of anchors) {
    rows.push({
      kind: 'anchor',
      key: `anchor-${anchor.id}`,
      minutes: minutesOfDay(anchor.usual_time),
      label: anchor.label,
      habits: habits.filter((habit) => habit.anchorId === anchor.id),
    });
  }

  for (const habit of habits.filter((h) => h.mode === 'at')) {
    rows.push({ kind: 'habit', key: `habit-${habit.id}`, minutes: habit.sortKey, habit });
  }

  rows.sort((a, b) => a.minutes - b.minutes);

  // The NOW line, dropped in where the clock currently sits.
  const withNow: Row[] = [];
  let placed = false;
  for (const row of rows) {
    if (!placed && row.minutes > nowMinutes) {
      withNow.push({ kind: 'now', key: 'now', minutes: nowMinutes });
      placed = true;
    }
    withNow.push(row);
  }
  if (!placed) withNow.push({ kind: 'now', key: 'now', minutes: nowMinutes });

  // Offer to fill any stretch of the day with nothing in it.
  const withGaps: Row[] = [];
  for (let i = 0; i < withNow.length; i += 1) {
    const row = withNow[i];
    if (!row) continue;
    withGaps.push(row);
    const next = withNow[i + 1];
    if (!next || row.kind === 'now' || next.kind === 'now') continue;
    const gap = next.minutes - row.minutes;
    if (gap >= FREE_GAP) {
      withGaps.push({
        kind: 'free',
        key: `free-${row.key}`,
        minutes: row.minutes + gap / 2,
        hours: Math.floor(gap / 60),
      });
    }
  }

  const anytime = habits.filter((h) => h.mode === 'any');
  if (anytime.length > 0) {
    withGaps.push({ kind: 'anytime', key: 'anytime', minutes: Number.MAX_SAFE_INTEGER, habits: anytime });
  }

  return withGaps;
}

type CheckInMutation = ReturnType<typeof useCheckIn>;

function renderRow(row: Row, checkIn: CheckInMutation) {
  switch (row.kind) {
    case 'anchor':
      return (
        <View key={row.key} style={styles.row}>
          <Text style={styles.time}>{formatMinutes(row.minutes)}</Text>
          <View style={styles.track}>
            <View style={styles.node} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.anchorLabel}>{row.label}</Text>
            {row.habits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} checkIn={checkIn} />
            ))}
          </View>
        </View>
      );
    case 'habit':
      return (
        <View key={row.key} style={styles.row}>
          <Text style={styles.time}>{formatMinutes(row.minutes)}</Text>
          <View style={styles.track}>
            <View style={[styles.node, { borderColor: row.habit.color }]} />
          </View>
          <View style={styles.rowBody}>
            <HabitCard habit={row.habit} checkIn={checkIn} />
          </View>
        </View>
      );
    case 'now':
      return (
        <View key={row.key} style={styles.row}>
          <Text style={[styles.time, styles.nowTime]}>{formatMinutes(row.minutes)}</Text>
          <View style={styles.track}>
            <View style={styles.nowDot} />
          </View>
          <View style={styles.nowBody}>
            <View style={styles.nowLine} />
            <Text style={styles.nowLabel}>{copy.myDay.now}</Text>
          </View>
        </View>
      );
    case 'free':
      return (
        <View key={row.key} style={styles.row}>
          <Text style={styles.time} />
          <View style={styles.track} />
          <View style={styles.rowBody}>
            <View style={styles.free}>
              <Text style={styles.freeText}>+ {copy.myDay.freeHours(row.hours)}</Text>
              <Text
                style={styles.freeLink}
                accessibilityRole="button"
                onPress={() => router.push('/habit')}
              >
                {copy.myDay.addHabit}
              </Text>
            </View>
          </View>
        </View>
      );
    case 'anytime':
      return (
        <View key={row.key} style={styles.row}>
          <Text style={styles.time} />
          <View style={styles.track}>
            <View style={styles.node} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.anchorLabel}>{copy.myDay.anytime}</Text>
            {row.habits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} checkIn={checkIn} />
            ))}
          </View>
        </View>
      );
  }
}

function HabitCard({ habit, checkIn }: { habit: TodayHabit; checkIn: CheckInMutation }) {
  return (
    <View
      style={[
        styles.habitCard,
        habit.checkedIn
          ? { backgroundColor: alpha(habit.color, 0.55) }
          : { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: habit.color, borderWidth: 1 },
      ]}
    >
      <View style={styles.habitText}>
        <Text style={styles.habitName} numberOfLines={1}>
          {habit.name}
        </Text>
        <Text style={styles.habitSub} numberOfLines={1}>
          {copy.myDay.solo} · {copy.myDay.everyDay}
        </Text>
      </View>
      <Text
        accessibilityRole="button"
        accessibilityLabel={copy.today.checkInLabel(habit.name)}
        onPress={() => {
          if (!habit.checkedIn) checkIn.mutate({ habitId: habit.id });
        }}
        style={styles.habitCheck}
      >
        {habit.checkedIn ? <CheckIcon size={18} color={colors.white} strokeWidth={3} /> : <View style={styles.openCircle} />}
      </Text>
    </View>
  );
}

function formatMinutes(minutes: number): string {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return formatTimeShort(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  link: { color: colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  counts: { alignItems: 'flex-end', paddingBottom: 4 },
  countsSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  timeline: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, minHeight: 34 },
  time: {
    width: 46,
    paddingTop: 2,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'right',
  },
  track: { width: 12, alignItems: 'center', paddingTop: 5 },
  node: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.textFaint,
  },
  rowBody: { flex: 1, gap: spacing.sm, paddingBottom: spacing.sm },
  anchorLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 14,
    borderRadius: radii.card,
  },
  habitText: { flex: 1, gap: 2 },
  habitName: { ...display(20, 20), color: colors.white },
  habitSub: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  habitCheck: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  openCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  nowTime: { color: habitColors[1] },
  nowDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: habitColors[1] },
  nowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: 4 },
  nowLine: { flex: 1, height: 1, backgroundColor: habitColors[1] },
  nowLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: habitColors[1],
  },
  free: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  freeText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
  freeLink: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
});
