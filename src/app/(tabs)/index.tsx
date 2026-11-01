import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/BrandHeader';
import { Bleed } from '@/components/Bleed';
import { PrimaryButton } from '@/components/Button';
import { BellIcon, CalendarIcon, RoundButton, TodoRow, anchorFor } from '@/components/DayParts';
import { useDockClearance } from '@/components/Dock';
import { FirstTimeHint } from '@/components/FirstTimeHint';
import { FILL_MS, HabitFan } from '@/components/HabitFan';
import { CheckIcon, CloseIcon } from '@/components/icons';
import { ProgressRing } from '@/components/ProgressRing';
import { copy } from '@/copy';
import {
  useAnchors,
  useCheckIn,
  useHabitHistory,
  useMyProfile,
  useNudgesForMe,
  useToday,
  useTodoActions,
  useTodos,
  useUndoCheckIn,
  type Todo,
} from '@/lib/api';
import { useStyles, useTheme } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { localDateString } from '@/lib/dates';
import { usePull } from '@/lib/pull';
import { isDue, shiftDate, startOfMonth, startOfWeek } from '@/lib/stats';
import { formatTime } from '@/lib/times';
import { openFocus, orderForDay } from '@/lib/today';
import { FREE_TODOS, showUpgrade, useIsPro } from '@/lib/pro';
import { alpha, fonts, habitColors, radii, spacing, type Palette } from '@/theme';

const RINGS = [
  { key: 'Today', color: habitColors[1], size: 112 },
  { key: 'Week', color: habitColors[2], size: 86 },
  { key: 'Month', color: habitColors[0], size: 60 },
] as const;

/** Home: today's to-dos, the habit fan, and how the day, week and month are going. */
export default function HomeScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const clearance = useDockClearance();
  const { session } = useAuth();
  const userId = session?.user.id;

  /**
   * Today, re-asked rather than remembered: an app left open across midnight
   * otherwise goes on showing yesterday, ticks and all. Re-asked when the app
   * comes back and when the screen does, which is how a phone that was asleep
   * overnight arrives here.
   */
  const [today, setToday] = useState(() => localDateString(new Date()));
  const readClock = useCallback(() => {
    const now = localDateString(new Date());
    setToday((current) => (current === now ? current : now));
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') readClock();
    });
    return () => sub.remove();
  }, [readClock]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- today is the clock
  const date = useMemo(() => new Date(), [today]);

  const { data: profile } = useMyProfile(userId);
  const { data: anchors = [] } = useAnchors(userId);
  const { data: habits = [], isPending, isError, refetch } = useToday(userId, date);
  const { data: history = [] } = useHabitHistory(userId);
  const { data: nudges = [], refetch: refetchNudges } = useNudgesForMe(userId);
  const { data: todos = [], refetch: refetchTodos } = useTodos(userId, date);
  const todo = useTodoActions(userId, date);
  const pull = usePull(refetch, refetchNudges, refetchTodos);
  // Server-first: the fan's fill is built per render, so an instant write
  // would re-render it mid-fill.
  const checkIn = useCheckIn(userId);
  const undo = useUndoCheckIn(userId);
  const busy = checkIn.isPending || undo.isPending;

  // Nudges are written by somebody else, so this screen is the only thing that
  // ever goes looking for them.
  useFocusEffect(
    useCallback(() => {
      readClock();
      void refetch();
      void refetchNudges();
    }, [readClock, refetch, refetchNudges]),
  );

  const [fanColor, setFanColor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ todo: Todo; text: string } | null>(null);
  const isPro = useIsPro();
  const addDraft = () => {
    if (!draft.trim()) return;
    // Free holds five open at once. The draft stays put, so it is still there
    // after upgrading or ticking one off.
    if (!isPro && todos.filter((t) => !t.done).length >= FREE_TODOS) return showUpgrade();
    todo.add(draft.trim());
    setDraft('');
  };
  const saveEdit = () => {
    if (!editing) return;
    const text = editing.text.trim();
    if (!text) todo.remove(editing.todo);
    else if (text !== editing.todo.title) todo.rename(editing.todo, text);
    setEditing(null);
  };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  /**
   * The order lags the data by one animation: checking in fills the card and
   * also sends it to the back of the hand, and done together you watch it
   * slide away instead of fill. A habit arriving or leaving lands at once.
   */
  const wanted = useMemo(() => orderForDay(habits), [habits]);
  const [order, setOrder] = useState<readonly string[]>(() => wanted.map((h) => h.id));
  useEffect(() => {
    const next = wanted.map((h) => h.id);
    if (next.length === order.length && next.every((id, at) => id === order[at])) return;
    const same = next.length === order.length && next.every((id) => order.includes(id));
    if (!same) {
      setOrder(next);
      return;
    }
    const timer = setTimeout(() => setOrder(next), FILL_MS);
    return () => clearTimeout(timer);
  }, [wanted, order]);
  const inHand = useMemo(() => {
    const slot = new Map(order.map((id, at) => [id, at]));
    return [...wanted].sort((a, b) => (slot.get(a.id) ?? order.length) - (slot.get(b.id) ?? order.length));
  }, [wanted, order]);
  const initialFocus = useMemo(() => openFocus(inHand), [inHand]);
  const first = (profile?.display_name ?? '').trim().split(/\s+/)[0] ?? '';
  const color = fanColor ?? habits.find((h) => !h.checkedIn)?.color ?? habitColors[0];
  const done = habits.filter((h) => h.checkedIn).length;
  const openCount = habits.length - done;

  // Done over due, summed across every day in the window; today is live.
  const rateSince = (from: string) => {
    let due = habits.length;
    let doneIn = done;
    for (let d = from; d < today; d = shiftDate(d, 1)) {
      for (const h of history) {
        if (!isDue(h, d, today)) continue;
        due += 1;
        if (h.checkedOn.includes(d)) doneIn += 1;
      }
    }
    return due ? doneIn / due : 0;
  };
  const rates = { Today: rateSince(today), Week: rateSince(startOfWeek(today)), Month: rateSince(startOfMonth(today)) };
  const pct = (r: number) => `${Math.round(r * 100)}%`;

  const whenOf = (t: Todo) => {
    const anchor = anchorFor(t, anchors);
    if (anchor) return `After ${anchor.label.toLowerCase()}`;
    return t.at ? formatTime(t.at) : 'Anytime';
  };
  const openTodos = todos.filter((t) => !t.done).length;

  const toggle = (h: { id: string; checkedIn: boolean }) =>
    h.checkedIn ? undo.mutate({ habitId: h.id, date }) : checkIn.mutate({ habitId: h.id, date });

  const openMyDay = () =>
    router.navigate({ pathname: '/my-day', params: { view: 'Day', opened: String(Date.now()) } });

  return (
    <View style={styles.root}>
      <Bleed color={color} />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingBottom: clearance, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl {...pull} tintColor={colors.textMuted} />}
      >
        <BrandHeader />

        <View style={[styles.padded, styles.welcome]}>
          <Text style={styles.hello} numberOfLines={1}>
            {first ? `Welcome, ${first}` : 'Welcome'}
          </Text>
          <RoundButton label="Notifications" onPress={() => router.push('/notifications')}>
            <BellIcon color={colors.text} />
          </RoundButton>
          <RoundButton label={copy.myDay.title} onPress={openMyDay}>
            <CalendarIcon color={colors.text} />
          </RoundButton>
        </View>

        {isError && <Text style={[styles.padded, styles.notice]}>{copy.today.loadFailed}</Text>}

        {nudges
          .filter((nudge) => !nudge.checkedIn)
          .map((nudge) => (
            <Pressable
              key={nudge.id}
              accessibilityRole="button"
              accessibilityLabel={`${copy.nudge.from(nudge.fromName)}: ${nudge.message}`}
              onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: nudge.id } })}
              style={({ pressed }) => [styles.card, styles.nudge, pressed && { opacity: 0.9 }]}
            >
              <View style={[styles.nudgeAvatar, { backgroundColor: nudge.fromColor }]}>
                <Text style={styles.nudgeInitials}>{nudge.fromName.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.nudgeFrom}>{copy.nudge.from(nudge.fromName)}</Text>
                <Text style={styles.nudgeMessage} numberOfLines={2}>
                  “{nudge.message}”
                </Text>
              </View>
              <View style={[styles.dot, { backgroundColor: nudge.habitColor }]} />
            </Pressable>
          ))}

        <View style={[styles.padded, { gap: 10 }]}>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>Today’s to-dos</Text>
            <Text style={styles.seeAll} onPress={openMyDay} accessibilityRole="button">
              {openTodos > 0 ? `${openTodos} left · See all` : 'See all'}
            </Text>
          </View>
          <View style={styles.card}>
            {todos.map((t, i) => (
              <View key={t.id} style={[styles.todoLine, i > 0 && styles.divider]}>
                {editing?.todo.id === t.id ? (
                  <View style={styles.addLine}>
                    {/* Holds the circle's place, so the words stay where they were. */}
                    <View style={{ width: 20 }} />
                    <TextInput
                      maxLength={120}
                      autoFocus
                      value={editing.text}
                      onChangeText={(text) => setEditing({ todo: t, text })}
                      returnKeyType="done"
                      onSubmitEditing={saveEdit}
                      style={styles.addInput}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${t.title}`}
                      onPress={() => {
                        todo.remove(t);
                        setEditing(null);
                      }}
                      hitSlop={5}
                      style={styles.iconBtn}
                    >
                      <CloseIcon size={18} color={colors.textMuted} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Save"
                      onPress={saveEdit}
                      hitSlop={5}
                      style={[styles.iconBtn, styles.confirm]}
                    >
                      <CheckIcon size={16} color={colors.bg} strokeWidth={3} />
                    </Pressable>
                  </View>
                ) : (
                  <TodoRow
                    todo={t}
                    when={whenOf(t)}
                    shown={today}
                    onToggle={() => todo.toggle(t)}
                    onEdit={() => setEditing({ todo: t, text: t.title })}
                    colors={colors}
                    height={46}
                  />
                )}
              </View>
            ))}
            <View style={[styles.todoLine, todos.length > 0 && styles.divider, styles.addLine]}>
              <Text style={styles.plus}>+</Text>
              <TextInput
                maxLength={120}
                value={draft}
                onChangeText={setDraft}
                placeholder="Add a to-do"
                placeholderTextColor={colors.textFaint}
                returnKeyType="done"
                onSubmitEditing={addDraft}
                style={styles.addInput}
              />
              {draft.trim().length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add to-do"
                  onPress={addDraft}
                  hitSlop={5}
                  style={[styles.iconBtn, styles.confirm]}
                >
                  <CheckIcon size={16} color={colors.bg} strokeWidth={3} />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <Text style={[styles.padded, styles.habitsTitle]}>Your habits</Text>

        {!isPending && habits.length === 0 && (
          <View style={[styles.padded, { gap: spacing.md }]}>
            <View style={[styles.card, styles.empty]}>
              <Text style={styles.emptyTitle}>{copy.today.emptyTitle}</Text>
              <Text style={styles.emptyBody}>{copy.today.emptyBody}</Text>
              <PrimaryButton label={copy.today.addHabit} onPress={() => router.push('/new-habit')} />
            </View>
          </View>
        )}

        {inHand.length > 0 && (
          <HabitFan
            key={today}
            habits={inHand}
            initialFocus={initialFocus}
            nowMinutes={nowMinutes}
            busy={busy}
            onToggle={toggle}
            onEdit={(h) => router.push({ pathname: '/new-habit', params: { id: h.id } })}
            onFocus={(h) => setFanColor(h.color)}
            variant="home"
          />
        )}

        {habits.length > 0 && (
          <View style={[styles.padded, styles.under]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/new-habit')}
              style={({ pressed }) => [styles.newHabit, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.newHabitText}>+ {copy.today.newHabit}</Text>
            </Pressable>
            <Text style={styles.fanHint} numberOfLines={1}>
              {openCount === 0 ? copy.today.allDone : copy.today.fanHint}
            </Text>
            {/* Each shows once, and only when it is true. */}
            {done === 0 && <FirstTimeHint id="first-check-in">{copy.hints.firstCheckIn}</FirstTimeHint>}
            {done > 0 && <FirstTimeHint id="streak-rule">{copy.hints.streakRule}</FirstTimeHint>}
            <FirstTimeHint id="dock-pips">{copy.hints.dockPips}</FirstTimeHint>
          </View>
        )}

        <View style={styles.padded}>
          <View style={[styles.card, styles.perf]}>
            <View style={styles.perfLeft}>
              <Text style={styles.big}>{pct(rates.Today)}</Text>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: RINGS[0].color }]} />
                <Text style={styles.bigLabel}>of today done</Text>
              </View>
              <View style={styles.legend}>
                {RINGS.slice(1).map((r) => (
                  <View key={r.key} style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: r.color }]} />
                    <Text style={styles.legendText}>
                      {r.key} <Text style={{ color: colors.text }}>{pct(rates[r.key])}</Text>
                    </Text>
                  </View>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/progress')}
                style={({ pressed }) => [styles.checkNow, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.checkNowText}>See progress</Text>
              </Pressable>
            </View>
            <View
              style={styles.rings}
              accessible
              accessibilityLabel={`Today ${pct(rates.Today)}, week ${pct(rates.Week)}, month ${pct(rates.Month)}`}
            >
              {RINGS.map((r) => (
                <View key={r.key} style={styles.ring}>
                  <ProgressRing
                    size={r.size}
                    strokeWidth={11}
                    progress={rates[r.key]}
                    color={r.color}
                    trackColor={alpha(r.color, 0.2)}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  padded: { paddingHorizontal: spacing.xl },
  welcome: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hello: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 28, letterSpacing: -0.4, color: colors.text },
  notice: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  habitsTitle: { fontFamily: fonts.bodyBold, fontSize: 24, textAlign: 'center', color: colors.text, marginBottom: -6 },
  section: { fontFamily: fonts.bodyMedium, fontSize: 20, color: colors.text },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, paddingVertical: 10, paddingLeft: 12 },
  card: {
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardEdge,
  },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.xl, padding: 14 },
  nudgeAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nudgeInitials: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.white },
  nudgeFrom: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  nudgeMessage: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  todoLine: { paddingHorizontal: 16 },
  divider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  addLine: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46 },
  plus: { width: 20, textAlign: 'center', fontFamily: fonts.bodyMedium, fontSize: 20, color: colors.textFaint },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginVertical: 5 },
  confirm: { backgroundColor: colors.text },
  addInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text, paddingVertical: 10 },
  empty: { gap: spacing.md, padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.bodyMedium, fontSize: 22, color: colors.text },
  emptyBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  under: { alignItems: 'center', gap: spacing.sm },
  newHabit: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: radii.chip,
    justifyContent: 'center',
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.cardEdge,
  },
  newHabitText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  fanHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint, textAlign: 'center' },
  perf: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  perfLeft: { gap: 2 },
  big: { fontFamily: fonts.bodyMedium, fontSize: 40, lineHeight: 44, letterSpacing: -0.8, color: colors.text },
  bigLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  legend: { gap: 4, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  checkNow: {
    marginTop: 14,
    alignSelf: 'flex-start',
    height: 34,
    paddingHorizontal: 15,
    borderRadius: radii.chip,
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  checkNowText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.bg },
  rings: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  ring: { position: 'absolute' },
}) as const;
