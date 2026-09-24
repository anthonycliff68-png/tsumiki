import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton } from '@/components/Button';
import { useDockClearance } from '@/components/Dock';
import { DayList } from '@/components/DayList';
import { HabitFan } from '@/components/HabitFan';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { useCheckIn, useNudgesForMe, useToday, useUndoCheckIn } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, formatBigDate, formatDayName } from '@/lib/dates';
import { alpha, display, fonts, habitColors, radii, spacing, tint, type Palette } from '@/theme';

/** Today. Artboard: TodayDark. */
export default function TodayScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const clearance = useDockClearance();
  const { session } = useAuth();
  const userId = session?.user.id;

  // 0 is today; going back fills in a day that was missed.
  const [dayOffset, setDayOffset] = useState(0);
  const [showingDone, setShowingDone] = useState(false);
  // The habit under your finger in the fan, so the glow behind the screen
  // tracks the card you are looking at rather than the one that was next.
  const [fanColor, setFanColor] = useState<string | null>(null);
  const viewedDate = useMemo(() => addDays(new Date(), dayOffset), [dayOffset]);
  const isToday = dayOffset === 0;

  const {
    data: habits = [],
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useToday(userId, viewedDate);
  const { data: nudges = [] } = useNudgesForMe(userId);
  const checkIn = useCheckIn(userId);
  const undo = useUndoCheckIn(userId);

  // Whatever wrote while we were away, pick it up on the way back in.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const today = new Date();
  const done = habits.filter((habit) => habit.checkedIn).length;

  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  // The hero is the next one still to come. A habit whose moment has already
  // passed is not "up next" — it goes to Missed, where it can still be done.
  const open = useMemo(() => habits.filter((habit) => !habit.checkedIn), [habits]);
  const missed = useMemo(
    () => (isToday ? open.filter((habit) => habit.sortKey < nowMinutes) : []),
    [open, isToday, nowMinutes],
  );
  const upcoming = useMemo(
    () => open.filter((habit) => !missed.includes(habit)),
    [open, missed],
  );
  const hero = useMemo(
    () => upcoming[0] ?? missed[0] ?? habits[habits.length - 1],
    [upcoming, missed, habits],
  );
  const finished = useMemo(() => habits.filter((habit) => habit.checkedIn), [habits]);
  const openCount = open.length;

  /**
   * The day in the order it happens, and nothing moves it. Checking a habit in
   * must not shuffle the hand, so the sort never looks at whether it is done.
   * Habits with no set time sit at the end — that is where the app already
   * treats them, and the only place that never jumps ahead of a real time.
   * Ties break on name, so two habits on the same moment keep a fixed order.
   */
  const inHand = useMemo(
    () =>
      [...habits].sort(
        (a, b) => a.sortKey - b.sortKey || a.name.localeCompare(b.name),
      ),
    [habits],
  );

  // Open on the first thing still to do. Once the day is done that is nothing,
  // so fall back to the start of the day rather than an arbitrary card.
  const initialFocus = useMemo(() => {
    const at = inHand.findIndex((habit) => !habit.checkedIn);
    return at === -1 ? 0 : at;
  }, [inHand]);

  // A new day is a new hand: remount so the focus rule runs again.
  const dayKey = viewedDate.toDateString();
  const onFanFocus = useCallback(
    (habit: { color: string }) => setFanColor(habit.color),
    [],
  );

  const toggle = (habit: { id: string; checkedIn: boolean }) =>
    habit.checkedIn
      ? undo.mutate({ habitId: habit.id, date: viewedDate })
      : checkIn.mutate({ habitId: habit.id, date: viewedDate });

  const bleedColor = fanColor ?? hero?.color ?? habitColors[0];

  return (
    <View style={styles.root}>
      <Bleed color={bleedColor} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xl,
          paddingBottom: clearance,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.textMuted} />
        }
      >
        <View style={styles.days}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${formatDayName(addDays(viewedDate, -1))}, the day before`}
            onPress={() => setDayOffset((offset) => offset - 1)}
            style={styles.dayButton}
          >
            <Text style={styles.dayMuted}>{formatDayName(addDays(viewedDate, -1))}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isToday ? copy.dock.tabs.today : copy.today.backToToday}
            disabled={isToday}
            onPress={() => setDayOffset(0)}
            style={styles.dayActive}
          >
            <Text style={styles.dayActiveText}>
              {isToday ? copy.dock.tabs.today : formatDayName(viewedDate)}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${formatDayName(addDays(viewedDate, 1))}, the day after`}
            disabled={isToday}
            onPress={() => setDayOffset((offset) => Math.min(0, offset + 1))}
            style={styles.dayButton}
          >
            <Text style={[styles.dayMuted, isToday && styles.dayDisabled]}>
              {formatDayName(addDays(viewedDate, 1))}
            </Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={display(76, 62)}>{formatBigDate(viewedDate)}</Text>
          <View style={styles.count}>
            <Text style={[display(30, 30), { color: tint(bleedColor, 0.55) }]}>
              {done}/{habits.length}
            </Text>
            <Text style={styles.countLabel}>{copy.today.doneCount}</Text>
          </View>
        </View>

        {isError && <Text style={styles.notice}>{copy.today.loadFailed}</Text>}

        {!isToday && <Text style={styles.notice}>{copy.today.viewingPast}</Text>}

        {isToday && nudges.filter((nudge) => !nudge.checkedIn).map((nudge) => (
          <Pressable
            key={nudge.id}
            accessibilityRole="button"
            accessibilityLabel={`${copy.nudge.from(nudge.fromName)}: ${nudge.message}`}
            onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: nudge.id } })}
            style={({ pressed }) => [
              styles.nudgeBanner,
              { borderColor: nudge.habitColor },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={[styles.nudgeAvatar, { backgroundColor: nudge.fromColor }]}>
              <Text style={styles.nudgeInitials}>{nudge.fromName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.nudgeText}>
              <Text style={styles.nudgeFrom}>{copy.nudge.from(nudge.fromName)}</Text>
              <Text style={styles.nudgeMessage} numberOfLines={2}>
                “{nudge.message}”
              </Text>
            </View>
          </Pressable>
        ))}

        {!isPending && habits.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{copy.today.emptyTitle}</Text>
            <Text style={styles.emptyBody}>{copy.today.emptyBody}</Text>
            <PrimaryButton label={copy.today.addHabit} onPress={() => router.push('/new-habit')} />
          </View>
        )}

        {inHand.length > 0 && (
          <HabitFan
            key={dayKey}
            habits={inHand}
            initialFocus={initialFocus}
            nowMinutes={isToday ? nowMinutes : null}
            busy={checkIn.isPending}
            onToggle={toggle}
            onEdit={(habit) => router.push({ pathname: '/new-habit', params: { id: habit.id } })}
            onFocus={onFanFocus}
          />
        )}

        {habits.length > 0 && openCount === 0 && (
          <View style={styles.padded}>
            <Text style={styles.allDone}>{copy.today.allDone}</Text>
          </View>
        )}

        {habits.length > 0 && (
          <View style={styles.padded}>
            <Text style={styles.fanHint}>{copy.today.fanHint}</Text>

            <View style={styles.chips}>
              {finished.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showingDone }}
                  accessibilityLabel={
                    showingDone ? copy.today.hideDone : copy.today.foldedAway(finished.length)
                  }
                  onPress={() => setShowingDone((open) => !open)}
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.chipText}>
                    {copy.today.foldedAway(finished.length)} ·{' '}
                    {showingDone ? copy.today.hideDone : copy.today.showDone}
                  </Text>
                </Pressable>
              )}

              {openCount > 0 && (
                <View style={[styles.chip, { backgroundColor: bleedColor, borderColor: bleedColor }]}>
                  <Text style={styles.chipText}>{copy.today.leftToday(openCount)}</Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.today.newHabit}
                onPress={() => router.push('/new-habit')}
                style={({ pressed }) => [
                  styles.chip,
                  { borderColor: tint(bleedColor, 0.35), backgroundColor: alpha(bleedColor, 0.28) },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.chipText, { color: tint(bleedColor, 0.75) }]}>
                  + {copy.today.newHabit}
                </Text>
              </Pressable>
            </View>

            {showingDone && (
              <View style={styles.listBlock}>
                <DayList
                  habits={finished}
                  nowMinutes={isToday ? nowMinutes : null}
                  onToggle={toggle}
                  onEdit={(habit) =>
                    router.push({ pathname: '/new-habit', params: { id: habit.id } })
                  }
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  padded: { paddingHorizontal: spacing.xl },
  fanHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  allDone: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.text,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dayButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  dayMuted: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textFaint,
  },
  dayDisabled: { opacity: 0.35 },
  dayActive: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    backgroundColor: colors.text,
  },
  dayActiveText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  count: { alignItems: 'flex-end', gap: 2, paddingBottom: 4 },
  countLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textFaint,
    textTransform: 'uppercase',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },
  sectionLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: tint(habitColors[0], 0.55) },
  listBlock: { gap: spacing.md },
  addRow: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.card,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  notice: {
    marginHorizontal: spacing.xl,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  empty: {
    marginHorizontal: spacing.xl,
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.bigCard,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emptyTitle: { ...display(30, 30) },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  addLabel: { fontFamily: fonts.bodyBold, fontSize: 15 },
  missedBlock: { gap: spacing.sm },
  missedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  missedDot: { width: 10, height: 10, borderRadius: 5 },
  missedName: { flex: 1, ...display(20, 20) },
  missedWhen: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textFaint },
  nudgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    padding: 14,
    borderRadius: radii.bigCard,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  nudgeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeInitials: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.white },
  nudgeText: { flex: 1, gap: 2 },
  nudgeFrom: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  nudgeMessage: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
}) as const;
