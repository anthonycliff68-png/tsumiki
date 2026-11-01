import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { BrandHeader } from '@/components/BrandHeader';
import { Bleed } from '@/components/Bleed';
import { useDockClearance } from '@/components/Dock';
import {
  BackIcon,
  ClockIcon,
  DotsIcon,
  Faces,
  RoundButton,
  TodoRow,
  UpDownIcon,
  anchorFor,
  clock,
  statusOf,
  useInstantToggle,
} from '@/components/DayParts';
import { EVENT_BLUE } from '@/components/DayPreview';
import { MonthGrid, ViewSwitch, WeekList, type View3 } from '@/components/DayViews';
import { HabitSheet, TodoSheet } from '@/components/EditSheets';
import { FirstTimeHint } from '@/components/FirstTimeHint';
import { MomentSheet, type MomentDraft } from '@/components/MomentSheet';
import { copy } from '@/copy';
import {
  useAnchorLoad,
  useAnchors,
  useDeleteAnchor,
  useHabitHistory,
  useMoveHabit,
  useToday,
  useTodoActions,
  useTodos,
  useUpdateAnchor,
  useUpdateHabit,
  type TodayHabit,
  type Todo,
  type TodoPlace,
} from '@/lib/api';
import { useStyles, useTheme } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { useTodayEvents, type DayEvent } from '@/lib/calendar';
import { addDays, localDateString } from '@/lib/dates';
import type { Anchor } from '@/lib/models';
import { emojiFor } from '@/lib/onboardingDay';
import { useIsPro } from '@/lib/pro';
import { usePull } from '@/lib/pull';
import { formatTime } from '@/lib/times';
import { alpha, fonts, habitColors, momentColor, spacing, type Palette } from '@/theme';

/** Width of the hour labels down the left. */
const GUTTER = 74;
const CARD_GAP = 10;
const DONE_ROW_H = 36;
/** A two-line calendar card, for one that has never been laid out open. */
const OPEN_CARD_H = 66;
/** How long after a tap another tap on the same card is ignored. */
const TAP_SETTLE_MS = 450;
/** How long a card has to be held before it lifts and can be moved. */
const HOLD_MS = 220;

const WAVE_H = 11;
const WATER_RESERVE = 56;
const CREST_FRONT =
  `M0 ${WAVE_H} C 12 1, 26 1, 38 ${WAVE_H * 0.5} S 74 ${WAVE_H}, 88 ${WAVE_H * 0.3} S 100 ${WAVE_H}, 100 ${WAVE_H}` +
  ` C 112 1, 126 1, 138 ${WAVE_H * 0.5} S 174 ${WAVE_H}, 188 ${WAVE_H * 0.3} S 200 ${WAVE_H}, 200 ${WAVE_H} Z`;
const CREST_BACK =
  `M0 ${WAVE_H} C 16 2, 30 ${WAVE_H * 0.9}, 50 ${WAVE_H * 0.35} S 82 2, 100 ${WAVE_H}` +
  ` C 116 2, 130 ${WAVE_H * 0.9}, 150 ${WAVE_H * 0.35} S 182 2, 200 ${WAVE_H} Z`;

function WaterLayer({ color, width, crest }: { color: string; width: number; crest: string }) {
  return (
    <View style={{ position: 'absolute', left: -width, top: 0, bottom: 0, width: width * 2 }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: -WAVE_H + 1, height: WAVE_H }}>
        <Svg width="100%" height={WAVE_H} viewBox={`0 0 200 ${WAVE_H}`} preserveAspectRatio="none">
          <Path d={crest} fill={color} />
        </Svg>
      </View>
      <View style={{ flex: 1, backgroundColor: color }} />
    </View>
  );
}

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
const VIEWS: View3[] = ['Day', 'Week', 'Month'];
const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const pad = (n: number) => String(n).padStart(2, '0');

/** Where a held card can be let go: after a moment, at an hour, or any time. */
type Target = { kind: 'anchor'; anchorId: string } | { kind: 'hour'; hour: number } | { kind: 'any' };
const ANY: Target = { kind: 'any' };

/** What a held card tells the day, with the card's height in the window. */
type Drag = {
  onPickUp: () => void;
  onHover: (y: number) => void;
  onDrop: (y: number) => void;
  onRelease: () => void;
};

/** My Day: the week, then the day as an hour rail. Hold anything to move it. */
export default function MyDayScreen() {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const clearance = useDockClearance();
  const { session } = useAuth();
  const userId = session?.user.id;

  // Re-read when the screen comes back, so the day and the hour marked as now
  // are never the ones from whenever the app was opened.
  const [today, setToday] = useState(() => new Date());
  const [offset, setOffset] = useState(0);
  const day = addDays(today, offset);
  const shown = localDateString(day);
  const isToday = offset === 0;

  const { data: habits = [], refetch: refetchDay } = useToday(userId, day);
  const { data: anchors = [], refetch: refetchAnchors } = useAnchors(userId);
  const { data: todos = [], refetch: refetchTodos } = useTodos(userId, day);
  const { data: todayTodos = [] } = useTodos(userId, today);
  const { data: history = [] } = useHabitHistory(userId);
  const todo = useTodoActions(userId, day);
  const moveHabit = useMoveHabit(userId);
  const updateAnchor = useUpdateAnchor(userId);
  const deleteAnchor = useDeleteAnchor();
  const updateHabit = useUpdateHabit(userId);
  const { data: stacks = [] } = useAnchorLoad(userId);
  const { toggle: instant } = useInstantToggle(userId);
  // Calendar events are Pro. Read-only: they show where they fall, nothing more.
  const isPro = useIsPro();
  const { data: events = [], refetch: refetchEvents } = useTodayEvents(isPro);
  const pull = usePull(refetchDay, refetchAnchors, refetchTodos, refetchEvents);

  useFocusEffect(
    useCallback(() => {
      setToday(new Date());
      void refetchDay();
    }, [refetchDay]),
  );

  // tsumiki:///my-day?view=Week opens straight onto a view. Home passes a
  // fresh `opened` each time, so its buttons always land back on today.
  const { view: viewParam, opened } = useLocalSearchParams<{ view?: View3; opened?: string }>();
  const [view, setView] = useState<View3>(viewParam ?? 'Day');
  useEffect(() => {
    if (viewParam) setView(viewParam);
    if (opened) setOffset(0);
  }, [viewParam, opened]);
  const offsetTo = (d: Date) => Math.round((d.getTime() - today.getTime()) / 86_400_000);

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const nowHour = today.getHours();
  const sunday = addDays(day, -day.getDay());
  const week = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));

  // One block per hour: the anchors in it, then its habits, then its to-dos,
  // so a to-do always sits under the moment and the habits it belongs to.
  type Block = { minute: number; anchors: Anchor[]; events: DayEvent[]; habits: TodayHabit[]; todos: Todo[] };
  const byHour = new Map<number, Block>();
  const blockAt = (minute: number) => {
    const hour = Math.floor(minute / 60);
    const block = byHour.get(hour) ?? { minute: hour * 60, anchors: [], events: [], habits: [], todos: [] };
    byHour.set(hour, block);
    return block;
  };
  const placed = new Set<string>();
  for (const a of anchors) blockAt(minutesOf(a.usual_time)).anchors.push(a);
  if (isToday) for (const e of events) blockAt(minutesOf(e.start)).events.push(e);
  for (const h of [...habits].sort((a, b) => a.sortKey - b.sortKey)) {
    if (h.mode === 'any' || !h.time) continue;
    placed.add(h.id);
    blockAt(h.sortKey).habits.push(h);
  }
  for (const t of todos) {
    const anchor = anchorFor(t, anchors);
    const minute = anchor ? minutesOf(anchor.usual_time) : t.at ? minutesOf(t.at) : null;
    if (minute === null) continue;
    placed.add(t.id);
    blockAt(minute).todos.push(t);
  }
  const blocks = [...byHour.values()].sort((a, b) => a.minute - b.minute);
  const anytimeHabits = habits.filter((h) => !placed.has(h.id));
  const anytimeTodos = todos.filter((t) => !placed.has(t.id));

  const firstHour = Math.min(Math.floor((blocks[0]?.minute ?? 9 * 60) / 60), isToday ? nowHour : 24);
  const lastMinute = Math.max(blocks[blocks.length - 1]?.minute ?? 18 * 60, isToday ? nowMinutes : 0);
  const lastHour = Math.ceil(lastMinute / 60);
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);
  const hero = habits.find((h) => !h.checkedIn)?.color ?? habitColors[0];
  // Up next is what the dock calls up next: the first open habit still to come.
  const active = isToday
    ? [...habits].sort((a, b) => a.sortKey - b.sortKey).find((h) => !h.checkedIn && h.time && h.sortKey >= nowMinutes)
    : undefined;

  const toggle = (h: TodayHabit) => {
    if (offset > 0) return;
    instant(h, day);
  };

  // --- moving things ---------------------------------------------------------

  const [carried, setCarried] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nodes = useRef(new Map<string, { node: View; target: Target }>());
  const rects = useRef<{ key: string; top: number; bottom: number; target: Target }[]>([]);

  const register = (key: string, target: Target) => (node: View | null) => {
    if (node) nodes.current.set(key, { node, target });
    else nodes.current.delete(key);
  };

  // Measured once the lift has rendered, so the "anytime" strip it shows is
  // measured too.
  useEffect(() => {
    if (!carried) return;
    const found: typeof rects.current = [];
    rects.current = found;
    nodes.current.forEach(({ node, target }, key) =>
      node.measureInWindow((_x, y, _w, h) => found.push({ key, top: y, bottom: y + h, target })),
    );
  }, [carried]);

  /** The smallest box containing the point, so a moment beats its hour. */
  const findRect = (y: number) =>
    rects.current
      .filter((r) => y >= r.top && y < r.bottom)
      .reduce<(typeof rects.current)[number] | undefined>(
        (best, r) => (!best || r.bottom - r.top < best.bottom - best.top ? r : best),
        undefined,
      );

  // The day slides into its new order when a move lands. Configured in the
  // render that draws the new order, because the cache answers a beat after
  // the drop, and an animation configured at the drop is spent on the drop's
  // own re-render.
  const order =
    blocks.map((b) => `${b.minute}:${b.anchors.map((a) => a.id)}:${b.habits.map((h) => h.id)}:${b.todos.map((t) => t.id)}`).join('|') +
    `|${anytimeHabits.map((h) => h.id)}:${anytimeTodos.map((t) => t.id)}`;
  const [moving, setMoving] = useState(false);
  const [drawn, setDrawn] = useState(order);
  if (order !== drawn) {
    if (moving) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMoving(false);
    }
    setDrawn(order);
  }

  const dragFor = (id: string, place: (target: Target) => void): Drag => ({
    onPickUp: () => {
      setError(null);
      setCarried(id);
    },
    onHover: (y) => {
      const key = findRect(y)?.key ?? null;
      setHovered((k) => (k === key ? k : key));
    },
    onDrop: (y) => {
      const target = findRect(y)?.target;
      if (target) place(target);
    },
    onRelease: () => {
      setCarried(null);
      setHovered(null);
    },
  });

  const placeHabit = (h: TodayHabit) => (t: Target) => {
    // Let go where it already was: nothing to do. Without this, putting a
    // 7:30 habit back on its own hour would quietly move it to 7:00.
    const same =
      t.kind === 'anchor'
        ? h.mode === 'after' && h.anchorId === t.anchorId
        : t.kind === 'hour'
          ? h.mode === 'at' && Math.floor(h.sortKey / 60) === t.hour
          : h.mode === 'any';
    if (same) return;
    setMoving(true);
    moveHabit.mutate(
      t.kind === 'anchor'
        ? { habitId: h.id, mode: 'after', anchorId: t.anchorId }
        : t.kind === 'hour'
          ? { habitId: h.id, mode: 'at', atTime: `${pad(t.hour)}:00` }
          : { habitId: h.id, mode: 'any' },
      { onError: () => setError(copy.myDay.moveFailed) },
    );
  };

  const placeTodo = (td: Todo) => (t: Target) => {
    const same =
      t.kind === 'anchor'
        ? td.anchorId === t.anchorId
        : t.kind === 'hour'
          ? !td.anchorId && td.at !== null && Number(td.at.slice(0, 2)) === t.hour
          : !td.anchorId && !td.at;
    if (same) return;
    setMoving(true);
    todo.move(td, t.kind === 'anchor' ? { anchorId: t.anchorId } : t.kind === 'hour' ? { at: `${pad(t.hour)}:00:00` } : 'any');
  };

  /**
   * A moment changes its usual time, keeping its minutes: 7:30 dropped on the
   * 9 o'clock row is 9:30. Habits stacked on it follow, because their time is
   * read from the moment's. Dropped on another moment, it takes that hour.
   */
  const placeMoment = (a: Anchor) => (t: Target) => {
    const other = t.kind === 'anchor' ? anchors.find((x) => x.id === t.anchorId) : undefined;
    const hour = t.kind === 'hour' ? t.hour : other ? Math.floor(minutesOf(other.usual_time) / 60) : null;
    const was = Math.floor(minutesOf(a.usual_time) / 60);
    if (hour === null || hour === was) return;
    const shift = (time: string) => {
      const m = (((minutesOf(time) + (hour - was) * 60) % 1440) + 1440) % 1440;
      return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    };
    setMoving(true);
    updateAnchor.mutate(
      { id: a.id, label: a.label, usualTime: shift(a.usual_time), endsAt: a.ends_at && shift(a.ends_at), color: a.color },
      { onError: () => setError(copy.myDay.moveFailed) },
    );
  };

  // --- tap to edit ------------------------------------------------------------

  const [momentDraft, setMomentDraft] = useState<MomentDraft | null>(null);
  const [editingHabit, setEditingHabit] = useState<TodayHabit | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const closeSheets = () => {
    setMomentDraft(null);
    setEditingHabit(null);
    setEditingTodo(null);
    setSheetError(null);
  };
  const openMoment = (a: Anchor) =>
    setMomentDraft({ id: a.id, label: a.label, usualTime: a.usual_time.slice(0, 5), endsAt: a.ends_at?.slice(0, 5) ?? null, color: a.color });
  const saveMoment = () => {
    if (!momentDraft?.id) return;
    if (!momentDraft.label.trim()) return setSheetError(copy.schedule.needLabel);
    if (momentDraft.endsAt && minutesOf(momentDraft.endsAt) <= minutesOf(momentDraft.usualTime)) {
      return setSheetError(copy.schedule.needLaterEnd);
    }
    setMoving(true);
    updateAnchor.mutate(
      { ...momentDraft, id: momentDraft.id },
      { onSuccess: closeSheets, onError: () => setSheetError(copy.myDay.edit.saveFailed) },
    );
  };
  const saveHabit = ({ when, days, color }: { when: TodoPlace; days: number[]; color: string }) => {
    if (!editingHabit) return;
    setMoving(true);
    updateHabit.mutate(
      {
        habitId: editingHabit.id,
        name: editingHabit.name,
        color,
        daysOfWeek: days,
        ...(when === 'any'
          ? { mode: 'any' as const }
          : 'anchorId' in when
            ? { mode: 'after' as const, anchorId: when.anchorId }
            : { mode: 'at' as const, atTime: when.at.slice(0, 5) }),
      },
      { onSuccess: closeSheets, onError: () => setSheetError(copy.myDay.edit.saveFailed) },
    );
  };

  const habitCard = (h: TodayHabit, now: number | null, open: boolean) => (
    <CalendarCard
      key={h.id}
      habit={h}
      nowMinutes={now}
      open={open}
      onToggle={() => toggle(h)}
      onEdit={() => setEditingHabit(h)}
      drag={dragFor(h.id, placeHabit(h))}
    />
  );
  const todoRow = (t: Todo, height: number, when?: string) => (
    <Lift key={t.id} onTap={(x) => (x < 44 ? todo.toggle(t) : setEditingTodo(t))} drag={dragFor(t.id, placeTodo(t))}>
      <TodoRow
        todo={t}
        when={when}
        shown={shown}
        onToggle={() => todo.toggle(t)}
        onEdit={() => setEditingTodo(t)}
        colors={colors}
        height={height}
        textStyle={styles.todoText}
      />
    </Lift>
  );
  /** The row holding the carried card draws above the rows after it. */
  const lifted = (ids: string[]) => carried !== null && ids.includes(carried) && styles.lifted;

  // A sideways swipe steps between Day, Week and Month. Off while a card is
  // held, so moving one never changes the view under it.
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .enabled(carried === null)
    .activeOffsetX([-30, 30])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      const next = VIEWS[VIEWS.indexOf(view) + (e.translationX < 0 ? 1 : -1)];
      if (next) setView(next);
    });

  return (
    <View style={styles.root}>
      <Bleed color={hero} />
      <GestureDetector gesture={swipe}>
        <ScrollView
          scrollEnabled={carried === null}
          contentContainerStyle={{
            paddingTop: insets.top + spacing.xl,
            paddingBottom: clearance,
            paddingHorizontal: spacing.xl,
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl {...pull} tintColor={colors.textMuted} />}
        >
          <BrandHeader />

          <FirstTimeHint id="myday-move">{copy.myDay.moveTip}</FirstTimeHint>

          <View style={styles.head}>
            <RoundButton
              label={view === 'Month' ? 'Previous month' : 'Previous week'}
              onPress={() => {
                if (view !== 'Month') return setOffset((o) => o - 7);
                const prev = new Date(day);
                prev.setMonth(prev.getMonth() - 1);
                setOffset(offsetTo(prev));
              }}
            >
              <BackIcon color={colors.text} />
            </RoundButton>
            <Text style={styles.title}>{copy.myDay.title}</Text>
            <RoundButton label={copy.myDay.editRoutine} onPress={() => router.push('/schedule')}>
              <DotsIcon color={colors.text} />
            </RoundButton>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to today"
            onPress={() => setOffset(0)}
            style={styles.monthRow}
          >
            <Text style={styles.month}>{day.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
            <View style={styles.monthChip}>
              <UpDownIcon size={14} color={colors.textMuted} />
            </View>
          </Pressable>

          <ViewSwitch value={view} onChange={setView} />

          {view === 'Week' && (
            <WeekList
              days={week}
              today={today}
              history={history}
              todosLeft={todayTodos.filter((t) => !t.done).length}
              onPick={(d) => {
                setOffset(offsetTo(d));
                setView('Day');
              }}
            />
          )}

          {view === 'Month' && (
            <MonthGrid
              month={day}
              today={today}
              history={history}
              onPick={(d) => {
                setOffset(offsetTo(d));
                setView('Day');
              }}
            />
          )}

          {view === 'Day' && (
            <>
              <View>
                {/* Never flattened away: losing this view when the fade comes off
                    made the move animation fly the week in from the top. */}
                <View collapsable={false} style={carried !== null && styles.hidden}>
                  <View style={styles.week}>
                    {week.map((d) => {
                      const selected = localDateString(d) === shown;
                      return (
                        <Pressable
                          key={d.toDateString()}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setOffset(offsetTo(d))}
                          style={[styles.weekCell, selected && styles.weekSelected]}
                        >
                          <Text style={styles.weekDay}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                          <Text style={styles.weekNum}>{d.getDate()}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.rule} />
                </View>
                {/* While something is held, the week makes way for "anytime", so
                    there is always somewhere to take a card off the clock. Drawn
                    over the week rather than added, so nothing below moves. */}
                {carried !== null && (
                  <View
                    ref={register('any-strip', ANY)}
                    collapsable={false}
                    style={[styles.anyStrip, hovered === 'any-strip' && styles.anyStripOn]}
                  >
                    <Text style={styles.anyStripText}>{copy.myDay.dropAnytime}</Text>
                  </View>
                )}
              </View>

              {anchors.length === 0 && <Text style={styles.empty}>{copy.myDay.empty}</Text>}
              {error && <Text style={styles.error}>{error}</Text>}

              {anytimeTodos.length > 0 && (
                <View
                  ref={register('any-todos', ANY)}
                  collapsable={false}
                  style={[styles.anyCard, hovered === 'any-todos' && styles.anyCardOn, lifted(anytimeTodos.map((t) => t.id))]}
                >
                  <View style={styles.anyHead}>
                    <Text style={styles.anyTitle}>{isToday ? 'Anytime today' : 'Anytime'}</Text>
                    <Text style={styles.anyCount}>{anytimeTodos.filter((t) => !t.done).length} left</Text>
                  </View>
                  {anytimeTodos.map((t) => (
                    <View key={t.id} style={styles.anyRow}>
                      {todoRow(t, 40)}
                    </View>
                  ))}
                </View>
              )}

              {anytimeHabits.length > 0 && (
                <View
                  ref={register('any-habits', ANY)}
                  collapsable={false}
                  style={[styles.anyHabits, hovered === 'any-habits' && styles.hover, lifted(anytimeHabits.map((h) => h.id))]}
                >
                  <Text style={styles.anyLabel}>Anytime habits</Text>
                  {anytimeHabits.map((h) => habitCard(h, null, false))}
                </View>
              )}

              {/* One row per hour, in normal flow: a row is as tall as what is in
                  it, so nothing is measured and nothing is repositioned while a
                  card animates. */}
              <View>
                {hours.map((h) => {
                  const current = isToday && h === nowHour;
                  const b = byHour.get(h);
                  const key = `h${h}`;
                  return (
                    <View
                      key={h}
                      ref={register(key, { kind: 'hour', hour: h })}
                      collapsable={false}
                      style={[
                        styles.hourRow,
                        hovered === key && styles.hover,
                        b && lifted([...b.anchors.map((x) => x.id), ...b.habits.map((x) => x.id), ...b.todos.map((x) => x.id)]),
                      ]}
                    >
                      <View style={styles.hour}>
                        <View style={[styles.hourPill, current && styles.hourNow]}>
                          <Text numberOfLines={1} style={[styles.hourText, current && { color: colors.text }]}>
                            {hourLabel(h)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.placed}>
                        {b?.anchors.map((a) => (
                          <Lift key={a.id} onTap={() => openMoment(a)} drag={dragFor(a.id, placeMoment(a))}>
                            <View
                              ref={register(`a${a.id}`, { kind: 'anchor', anchorId: a.id })}
                              collapsable={false}
                              style={[styles.anchorLine, hovered === `a${a.id}` && styles.anchorLineOn]}
                            >
                              <View style={[styles.tick, { backgroundColor: momentColor(a) }]} />
                              <Text style={styles.anchorEmoji}>{emojiFor(a.label)}</Text>
                              <Text style={styles.anchorLabel}>{a.label}</Text>
                              <Text style={styles.anchorTime}>{clock(a.usual_time)}</Text>
                            </View>
                          </Lift>
                        ))}
                        {b?.events.map((e) => (
                          <View key={e.id} style={styles.event}>
                            <Text numberOfLines={1} style={styles.eventTitle}>
                              {e.title}
                            </Text>
                            <Text style={styles.anchorTime}>{`${clock(e.start)} – ${clock(e.end)}`}</Text>
                          </View>
                        ))}
                        {b?.habits.map((habit) =>
                          habitCard(habit, isToday ? nowMinutes : null, habit.id === active?.id),
                        )}
                        {b && b.todos.length > 0 && (
                          <View style={styles.todos}>
                            {b.todos.map((t) =>
                              todoRow(
                                t,
                                32,
                                t.at ? formatTime(t.at) : `After ${anchorFor(t, anchors)?.label.toLowerCase() ?? ''}`,
                              ),
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </GestureDetector>

      <MomentSheet
        draft={momentDraft}
        stacked={momentDraft?.id ? (stacks.find((s) => s.anchorId === momentDraft.id)?.count ?? 0) : 0}
        stackedNames={habits.filter((h) => h.anchorId === momentDraft?.id).map((h) => h.name)}
        busy={updateAnchor.isPending || deleteAnchor.isPending}
        error={sheetError}
        onChange={setMomentDraft}
        onSave={saveMoment}
        onDelete={() =>
          momentDraft?.id &&
          deleteAnchor.mutate(momentDraft.id, {
            onSuccess: closeSheets,
            onError: () => setSheetError(copy.schedule.deleteFailed),
          })
        }
        onClose={closeSheets}
      />
      {editingHabit && (
        <HabitSheet
          habit={editingHabit}
          anchors={anchors}
          busy={updateHabit.isPending}
          error={sheetError}
          onSave={saveHabit}
          onMore={() => {
            closeSheets();
            router.push({ pathname: '/new-habit', params: { id: editingHabit.id } });
          }}
          onClose={closeSheets}
        />
      )}
      {editingTodo && (
        <TodoSheet
          todo={editingTodo}
          anchors={anchors}
          onSave={({ title, when }) => {
            if (title !== editingTodo.title) todo.rename(editingTodo, title);
            todo.move(editingTodo, when);
            closeSheets();
          }}
          onDelete={() => {
            todo.remove(editingTodo);
            closeSheets();
          }}
          onClose={closeSheets}
        />
      )}
    </View>
  );
}

/**
 * Tap it, or hold it and move it. The detector claims the touch before a
 * Pressable inside can see it, so the tap is handed in here; the Pressables
 * inside stay for VoiceOver, which activates them directly.
 */
function Lift({ drag, onTap, children }: { drag: Drag; onTap: (x: number) => void; children: ReactNode }) {
  const styles = useStyles(makeStyles);
  const offset = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const ref = useRef<View>(null);
  /** From the finger to the card's middle, so the card is what aims. */
  const aim = useRef(0);
  const [held, setHeld] = useState(false);

  // runOnJS: the UI-thread path runs through Reanimated's worklets, which
  // segfault inside Expo Go.
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e, success) => {
      if (success) onTap(e.x);
    });
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(HOLD_MS)
    .onStart((e) => {
      ref.current?.measureInWindow((_x, y, _w, h) => {
        aim.current = y + h / 2 - e.absoluteY;
      });
      Animated.spring(scale, { toValue: 1.03, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
      setHeld(true);
      drag.onPickUp();
    })
    .onUpdate((e) => {
      offset.setValue({ x: e.translationX, y: e.translationY });
      drag.onHover(e.absoluteY + aim.current);
    })
    .onEnd((e) => drag.onDrop(e.absoluteY + aim.current))
    .onFinalize(() => {
      Animated.spring(offset, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      setHeld(false);
      drag.onRelease();
    });

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View
        ref={ref}
        collapsable={false}
        style={[
          { transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale }] },
          // Solid while held: the cards are see-through, and one carried over
          // another read as two cards printed on top of each other.
          held && styles.held,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

/** A habit on the calendar: the card, and the water on check-in. */
function CalendarCard({
  habit,
  nowMinutes,
  open,
  onToggle,
  onEdit: edit,
  drag,
}: {
  habit: TodayHabit;
  nowMinutes: number | null;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  drag: Drag;
}) {
  const styles = useStyles(makeStyles);
  const colors = useTheme();
  const status = statusOf(habit, nowMinutes, open ? habit.id : undefined);
  const fold = useRef(new Animated.Value(1)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const strike = useRef(new Animated.Value(habit.checkedIn ? 1 : 0)).current;
  const was = useRef(habit.checkedIn);
  /**
   * fill: checking off — water rises, card folds to a line.
   * unstrike, drain: undoing — the line pulls back, the row grows into a card
   * still full of colour, and the water sinks out the bottom. Quieter than the
   * fill: no splash, no bounce, because undoing is a correction.
   */
  const [phase, setPhase] = useState<'fill' | 'unstrike' | 'drain' | null>(null);
  const celebrating = phase === 'fill' || phase === 'drain';
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [nameW, setNameW] = useState(0);

  // A card that was already done when it mounted was never measured open.
  const openH = size.h || OPEN_CARD_H;

  /**
   * Built once per size, never per render.
   *
   * A fresh interpolation on every render looks harmless and is not: when React
   * Native swaps the old one out, the value behind it is left with nothing
   * attached for a moment and stops whatever animation it was running. A
   * check-in or an undo re-renders the day a fraction of a second later, when
   * the server answers, so the strike or the fold was being cancelled partway
   * through — and the card, waiting for an animation that would never finish,
   * stayed stuck and stopped taking taps.
   */
  const strikeW = useMemo(() => strike.interpolate({ inputRange: [0, 1], outputRange: [0, nameW] }), [strike, nameW]);
  const foldH = useMemo(() => fold.interpolate({ inputRange: [0, 1], outputRange: [DONE_ROW_H, openH] }), [fold, openH]);
  const riseY = useMemo(() => rise.interpolate({ inputRange: [0, 1], outputRange: [openH, 0] }), [rise, openH]);
  const driftBack = useMemo(() => drift.interpolate({ inputRange: [0, 1], outputRange: [size.w, 0] }), [drift, size.w]);
  const driftFront = useMemo(() => drift.interpolate({ inputRange: [0, 1], outputRange: [0, size.w] }), [drift, size.w]);

  /**
   * Which run of the animation is current. Every step hands on to the next
   * whether or not it was interrupted, so a card can never be left waiting —
   * but only if it still belongs to the latest run, so a step from a check-in
   * that was undone halfway cannot overwrite the undo.
   */
  const run = useRef(0);

  /**
   * One tap per change. A tap takes about a tenth of a second to come back as a
   * new check-in state and start its animation, and until then the phase guard
   * below has nothing to go on — a quick double tap landed both, checking the
   * habit in and straight back out. Taps inside this window are the same tap.
   */
  const lastTap = useRef(0);
  const press = () => {
    const now = Date.now();
    if (phase !== null || now - lastTap.current < TAP_SETTLE_MS) return;
    lastTap.current = now;
    onToggle();
  };

  useEffect(() => {
    if (habit.checkedIn === was.current) return;
    const justDone = habit.checkedIn;
    was.current = habit.checkedIn;
    const mine = ++run.current;
    const current = () => mine === run.current;
    drift.setValue(0);
    const drifting = Animated.loop(Animated.timing(drift, { toValue: 1, duration: 1500, useNativeDriver: true }));

    if (!justDone) {
      setPhase('unstrike');
      Animated.timing(strike, { toValue: 0, duration: 140, useNativeDriver: false }).start(() => {
        if (!current()) return;
        fold.setValue(0);
        rise.setValue(1);
        setPhase('drain');
        drifting.start();
        Animated.sequence([
          Animated.timing(fold, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          Animated.delay(80),
          Animated.timing(rise, { toValue: 0, duration: 340, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(() => {
          drifting.stop();
          if (current()) setPhase(null);
        });
      });
      return () => drifting.stop();
    }

    fold.setValue(1);
    rise.setValue(0);
    strike.setValue(0);
    setPhase('fill');
    drifting.start();
    Animated.sequence([
      Animated.parallel([
        Animated.spring(rise, { toValue: 1, useNativeDriver: true, speed: 13, bounciness: 12 }),
        Animated.sequence([
          Animated.delay(154),
          Animated.spring(scale, { toValue: 1.03, useNativeDriver: true, speed: 60, bounciness: 16 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 6 }),
        ]),
      ]),
      Animated.delay(150),
      Animated.timing(fold, { toValue: 0, duration: 180, useNativeDriver: false }),
    ]).start(() => {
      drifting.stop();
      if (!current()) return;
      setPhase(null);
      Animated.timing(strike, { toValue: 1, duration: 130, useNativeDriver: false }).start();
    });
    return () => drifting.stop();
  }, [habit.checkedIn, drift, fold, rise, scale, strike]);

  // At rest, draw what the card last settled as, not the new value: for the one
  // frame between a tap landing and the animation starting, drawing the new
  // value flashed the finished state before the animation played it.
  // eslint-disable-next-line react-hooks/refs -- read after the effect has synced it
  if (phase === 'unstrike' || (phase === null && was.current)) {
    return (
      <Lift drag={drag} onTap={press}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ checked: true }}
          accessibilityLabel={`Undo ${habit.name}`}
          onPress={press}
          style={styles.doneRow}
        >
          <View style={[styles.doneStub, { backgroundColor: habit.color }]} />
          <View style={{ flex: 1 }} onLayout={(e) => setNameW(e.nativeEvent.layout.width)}>
            <Text style={styles.doneName} numberOfLines={1}>
              {habit.name}
            </Text>
            <Animated.View style={[styles.strike, { width: strikeW }]} />
          </View>
          <Text style={styles.doneWhen}>Complete</Text>
        </Pressable>
      </Lift>
    );
  }

  // White words only while the fill is rising; a drain starts full of colour
  // and ends on the card, where the normal ink reads at both ends.
  const wet = phase === 'fill';
  const ink = wet ? colors.white : undefined;

  return (
    <Lift drag={drag} onTap={press}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Check in ${habit.name}`} onPress={press}>
        {/* Two views: scale runs on the native driver and height cannot, and
            one view carrying both crashes on the fold. */}
        <Animated.View style={{ transform: [{ scale }] }}>
          <Animated.View
            onLayout={(e) => {
              const { width: w, height: h } = e.nativeEvent.layout;
              // Width never changes mid-animation, so it is always safe to take.
              setSize((prev) => (celebrating ? { w, h: prev.h } : { w, h }));
            }}
            style={[styles.card, { height: celebrating ? foldH : undefined }]}
          >
            {celebrating && (
              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { bottom: -WATER_RESERVE, transform: [{ translateY: riseY }] }]}
              >
                <Animated.View
                  style={[StyleSheet.absoluteFill, { top: 4, opacity: 0.55, transform: [{ translateX: driftBack }] }]}
                >
                  <WaterLayer color={habit.color} width={size.w} crest={CREST_BACK} />
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: driftFront }] }]}>
                  <WaterLayer color={habit.color} width={size.w} crest={CREST_FRONT} />
                </Animated.View>
              </Animated.View>
            )}

            <View style={[styles.bar, { backgroundColor: ink ?? habit.color }]} />
            <View style={{ flex: 1 }}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardName, ink && { color: ink }]} numberOfLines={1}>
                  {habit.name}
                </Text>
                {/* Its own tap, inside the card's: the dots edit, the rest checks in. */}
                <GestureDetector gesture={Gesture.Tap().runOnJS(true).onEnd((_e, ok) => ok && edit())}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${habit.name}`} hitSlop={12} onPress={edit}>
                    <DotsIcon color={ink ?? colors.textFaint} />
                  </Pressable>
                </GestureDetector>
              </View>
              <View style={styles.cardFoot}>
                <Text style={[styles.cardStatus, wet && { color: 'rgba(255,255,255,0.8)' }]}>
                  {wet ? 'Complete' : status}
                </Text>
                <View style={styles.when}>
                  <Faces habit={habit} ring={colors.bg} size={20} />
                  <ClockIcon size={14} color={ink ?? colors.textMuted} />
                  <Text style={[styles.whenText, ink && { color: ink }]}>
                    {habit.time ? clock(habit.time) : 'Anytime'}
                  </Text>
                </View>
              </View>
              {open && !wet && (
                <View style={styles.note}>
                  <Text style={styles.noteText}>Tap the card when it’s done. Hold it to move it.</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Lift>
  );
}

const makeStyles = (colors: Palette) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.bodyMedium, fontSize: 22, color: colors.text },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 44 },
  month: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.text },
  monthChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
  },
  hidden: { opacity: 0 },
  week: { flexDirection: 'row', marginHorizontal: -4 },
  weekCell: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 9, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
  weekSelected: { backgroundColor: colors.raised, borderColor: colors.cardEdge },
  weekDay: { fontFamily: fonts.body, fontSize: 15, color: colors.textFaint },
  weekNum: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  rule: { height: 1, backgroundColor: colors.hairline, marginTop: 10, marginBottom: 6 },
  anyStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: alpha(colors.text, 0.25),
    alignItems: 'center',
    justifyContent: 'center',
  },
  anyStripOn: { backgroundColor: colors.raised, borderStyle: 'solid', borderColor: alpha(colors.text, 0.4) },
  anyStripText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
  empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[1] },
  lifted: { zIndex: 10 },
  held: {
    zIndex: 10,
    borderRadius: 16,
    backgroundColor: colors.bg,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  hover: { backgroundColor: colors.raised, borderRadius: 16 },
  hourRow: { flexDirection: 'row', minHeight: 34, paddingVertical: 4 },
  hour: { width: GUTTER, marginLeft: -6, alignItems: 'center', paddingTop: 1 },
  hourPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  hourNow: { backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.cardEdge },
  hourText: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
  placed: { flex: 1, gap: 6 },
  anyHabits: { gap: CARD_GAP },
  anyLabel: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.text, marginTop: spacing.sm },
  card: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 11,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardEdge,
  },
  bar: { width: 3, borderRadius: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  cardStatus: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  when: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  whenText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  note: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10, backgroundColor: colors.raised },
  noteText: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  anchorLine: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 22, borderRadius: 8 },
  anchorLineOn: { backgroundColor: colors.raised, marginHorizontal: -6, paddingHorizontal: 6 },
  tick: { width: 3, height: 13, borderRadius: 2 },
  anchorEmoji: { fontSize: 12 },
  event: {
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: EVENT_BLUE,
    backgroundColor: alpha(EVENT_BLUE, 0.18),
  },
  eventTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  anchorLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.textMuted },
  anchorTime: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  todos: { paddingLeft: 4 },
  anyCard: { borderRadius: 16, paddingHorizontal: 14, paddingBottom: 4, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardEdge },
  anyCardOn: { borderColor: alpha(colors.text, 0.35) },
  anyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 4 },
  anyTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.textMuted },
  anyCount: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
  anyRow: { borderTopWidth: 1, borderTopColor: colors.hairline },
  todoText: { fontSize: 14, color: colors.textMuted },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: DONE_ROW_H, paddingHorizontal: spacing.sm },
  doneStub: { width: 14, height: 3, borderRadius: 2, opacity: 0.7 },
  doneName: { alignSelf: 'flex-start', fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: colors.textFaint },
  strike: { position: 'absolute', left: 0, top: 10, height: 1, backgroundColor: colors.textFaint },
  doneWhen: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
}) as const;
