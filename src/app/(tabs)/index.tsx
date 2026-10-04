import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bleed } from '@/components/Bleed';
import { PrimaryButton } from '@/components/Button';
import { useDockClearance } from '@/components/Dock';
import { DayList } from '@/components/DayList';
import { FILL_MS, HabitFan } from '@/components/HabitFan';
import { useStyles, useTheme } from '@/lib/appearance';
import { copy } from '@/copy';
import { useCheckIn, useNudgesForMe, useToday, useUndoCheckIn } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, formatBigDate, formatDayName, localDateString } from '@/lib/dates';
import { openFocus, orderForDay } from '@/lib/today';
import { alpha, display, fonts, habitColors, ink, radii, spacing, type Palette } from '@/theme';
import { Display } from '@/components/Screen';
import { FirstTimeHint } from '@/components/FirstTimeHint';

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
  /**
   * Today, re-asked rather than remembered.
   *
   * This was worked out once and then kept, so an app left open across
   * midnight went on showing yesterday with "Today" above it and yesterday's
   * check-ins still ticked — while the dock, which asks the clock itself, said
   * nothing had been done. One screen disagreeing with itself about what day it
   * is, and the half that was wrong is the half telling you that you are
   * finished.
   *
   * Re-asked when the app comes back and when the screen does, which is how a
   * phone that was asleep overnight arrives at this screen. An app held awake
   * and in the foreground through midnight is the one case left; it corrects
   * itself the moment anything is tapped.
   */
  const [todayKey, setTodayKey] = useState(() => localDateString(new Date()));
  const readClock = useCallback(() => {
    const now = localDateString(new Date());
    setTodayKey((current) => (current === now ? current : now));
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') readClock();
    });
    return () => sub.remove();
  }, [readClock]);

  const viewedDate = useMemo(
    () => addDays(new Date(), dayOffset),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- todayKey is the clock
    [dayOffset, todayKey],
  );
  const isToday = dayOffset === 0;

  const {
    data: habits = [],
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useToday(userId, viewedDate);
  const { data: nudges = [], refetch: refetchNudges } = useNudgesForMe(userId);
  const checkIn = useCheckIn(userId);
  const undo = useUndoCheckIn(userId);

  // Whatever wrote while we were away, pick it up on the way back in.
  //
  // Nudges too, and that is the point of the second line: they are written by
  // somebody else, so this screen is the only thing that ever goes looking for
  // them. Without it a nudge sat unread until the app was killed and reopened —
  // which is the one way nobody uses an app they are already holding.
  useFocusEffect(
    useCallback(() => {
      readClock();
      void refetch();
      void refetchNudges();
    }, [readClock, refetch, refetchNudges]),
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

  // Both rules live in lib/today, under test. This screen had drifted its own
  // copy of each, which is how the order and the tests covering it came to
  // disagree without anything failing.
  const wanted = useMemo(() => orderForDay(habits), [habits]);

  /**
   * The order lags the data by one animation.
   *
   * Checking in floods the card with colour, and the same check-in sends it to
   * the back of the hand. Done on the tap those fight: the card left the front
   * before it had filled, so you watched it slide away rather than fill. The
   * habits themselves stay live — that is what makes the card start filling
   * the instant you tap it — and only the order waits for the fill to land
   * before dealing the card away.
   *
   * A habit arriving or leaving is not a check-in and lands at once, or the
   * first load, every new habit and every change of day would each spend half
   * a second showing the wrong hand.
   */
  const [order, setOrder] = useState<readonly string[]>(() => wanted.map((h) => h.id));
  useEffect(() => {
    const next = wanted.map((habit) => habit.id);
    if (next.length === order.length && next.every((id, at) => id === order[at])) return;
    const sameHabits = next.length === order.length && next.every((id) => order.includes(id));
    if (!sameHabits) {
      setOrder(next);
      return;
    }
    const timer = setTimeout(() => setOrder(next), FILL_MS);
    return () => clearTimeout(timer);
  }, [wanted, order]);

  const inHand = useMemo(() => {
    const slot = new Map(order.map((id, at) => [id, at]));
    // A habit the held order has not seen yet sits at the end for the one
    // render it takes the effect above to catch up.
    return [...wanted].sort(
      (a, b) => (slot.get(a.id) ?? order.length) - (slot.get(b.id) ?? order.length),
    );
  }, [wanted, order]);

  const initialFocus = useMemo(() => openFocus(inHand), [inHand]);

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
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
              void refetchNudges();
            }}
            tintColor={colors.textMuted}
          />
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
          <Display size={76} line={62}>{formatBigDate(viewedDate)}</Display>
          <View style={styles.count}>
            <Text style={[display(30, 30), { color: ink(bleedColor, colors) }]}>
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

        {habits.length > 0 && (
          <View style={styles.padded}>
            {/* Finishing the day used to add a block here, so the page grew by
                its height on the check-in that finished it and shrank again on
                the undo — everything below jumped, and if you were scrolled at
                all the fan moved under your thumb. One line replacing another
                says the same thing and leaves the page exactly as tall. */}
            {/* Above the hint, not below it. The row was the last thing on the
                screen and sat under the floating dock at rest, so the only way
                to add a habit was to scroll to reach it. */}
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

              {/* A count, not a control. It was the only filled chip in the row
                  while being the one thing in it that cannot be tapped, which
                  taught the loudest thing here is the thing to press. It is
                  quiet now, and the button below took the fill. */}
              {openCount > 0 && (
                <View style={[styles.chip, { borderColor: colors.border }]}>
                  <Text style={[styles.chipText, { color: colors.textMuted }]}>
                    {copy.today.leftToday(openCount)}
                  </Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.today.newHabit}
                onPress={() => router.push('/new-habit')}
                // Filled, and in the habit colour the screen is already tinted
                // with: the one action in the row should look like the one
                // action in the row.
                style={({ pressed }) => [
                  styles.chip,
                  styles.chipAction,
                  { backgroundColor: bleedColor, borderColor: bleedColor },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.chipText, styles.chipActionText, { color: colors.bg }]}>
                  + {copy.today.newHabit}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.fanHint} numberOfLines={1}>
              {openCount === 0 ? copy.today.allDone : copy.today.fanHint}
            </Text>

            <FirstTimeHint id="dock-pips">{copy.hints.dockPips}</FirstTimeHint>

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
  chipAction: { paddingHorizontal: 22 },
  chipActionText: { fontSize: 15 },
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
  sectionLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: ink(habitColors[0], colors) },
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
    backgroundColor: alpha(colors.overlay, 0.04),
  },
  emptyTitle: { ...display(30, 30), color: colors.text },
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
    backgroundColor: alpha(colors.overlay, 0.05),
  },
  missedDot: { width: 10, height: 10, borderRadius: 5 },
  missedName: { flex: 1, ...display(20, 20), color: colors.text },
  missedWhen: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textFaint },
  nudgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    padding: 14,
    borderRadius: radii.bigCard,
    borderWidth: 1,
    backgroundColor: alpha(colors.overlay, 0.06),
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
