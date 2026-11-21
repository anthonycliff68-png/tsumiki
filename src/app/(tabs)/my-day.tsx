import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Image, LayoutAnimation, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/BrandHeader';
import { Bleed } from '@/components/Bleed';
import { useDockClearance } from '@/components/Dock';
import {
  CalendarIcon,
  ChevronIcon,
  DotsIcon,
  MoonIcon,
  RoundButton,
  anchorFor,
  useInstantToggle,
} from '@/components/DayParts';
import { EditDots, HabitItem, INK, LengthPill, TodoItem, carriedLabel, sized, todoTint } from '@/components/DayRows';
import { guessEmoji, loud } from '@/lib/dayLook';
import { MonthGrid } from '@/components/DayViews';
import { AddTodoSheet, ItemSheet, type ItemEdit } from '@/components/EditSheets';
import { FirstTimeHint } from '@/components/FirstTimeHint';
import { Lift, type Drag } from '@/components/Lift';
import { MomentSheet, type MomentDraft } from '@/components/MomentSheet';
import { ProgressRing } from '@/components/ProgressRing';
import { Reveal } from '@/components/Reveal';
import { copy } from '@/copy';
import {
  useAnchorLoad,
  useAnchors,
  useArchiveHabit,
  useDeleteAnchor,
  useHabitHistory,
  useMoveHabit,
  useNudgesForMe,
  useToday,
  useTodoActions,
  useTodos,
  useUpdateAnchor,
  useUpdateHabit,
  type TodayHabit,
  type Todo,
  type TodoPlace,
} from '@/lib/api';
import { useAccess } from '@/lib/access';
import { useStyles, useTheme } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { askForCalendar, useTodayEvents, type DayEvent } from '@/lib/calendar';
import { addDays, daysFrom, localDateString } from '@/lib/dates';
import { hasAccess } from '@/lib/entitlement';
import type { Anchor } from '@/lib/models';
import { emojiFor } from '@/lib/onboardingDay';
import { FREE_TODOS, showUpgrade, useIsPro } from '@/lib/pro';
import { usePull } from '@/lib/pull';
import { currentRun, shiftDate, statsFor } from '@/lib/stats';
import { emptyRuns, formatLength, laySpans, lineSpans, lineUp, minuteAt, type LineRow, type Slot, type Span } from '@/lib/timeline';
import { formatTime } from '@/lib/times';
import { alpha, display, fonts, habitColors, momentColor, spacing, type Palette } from '@/theme';
import { lengthScale, pickNext } from '@/lib/timeline';
import { Stones, type StoneItem } from '@/components/Stones';
import { Peaks } from '@/components/Peaks';
import { Stack } from '@/components/Stack';

/** Width of the hour labels down the left. */
const GUTTER = 74;
const EVENT_BLUE = '#4A7FD4';
/** Preview: the day as one straight line. false puts the hour rail back. */
const ONE_LINE = false;
/** Preview of duets/adhd-planner/spec.md. false puts today's look back. Saves nothing new. */
const ADHD: boolean = true;
/** Preview of concept 3 in duets/adhd-planner/concepts.html, on top of ADHD. false puts the hour rail back. */
const STONES: boolean = false;
/** Preview of the stack + rail in duets/adhd-planner/mockups.html: a made-up day, saves nothing. false puts the hour rail back. */
const STACK: boolean = false;
/** Preview of duets/adhd-planner/types-focus-v2.html (Sunset, anchors with no background, focus water drains). Made up, saves nothing. */
const PEAKS: boolean = false;
// ponytail: only when no to-do is open, so the big stone and its steps show. Made up, saves nothing.
const SAMPLE_TODO_STEPS = ['Gather the receipts', "Find last year's form", 'Fill it in and send'];
// ponytail: made-up steps so the preview has some to show, ticks not saved.
// Goes when the edit sheet can add real ones.
const SAMPLE_STEPS: Record<string, string[]> = {
  'Walk my dog': ['Leash and bags', 'Loop the park', 'Fill water bowl'],
};
// ponytail: shown only when the calendar has nothing today, so the blue is visible.
const SAMPLE_EVENTS: DayEvent[] = [
  { id: 'sample-standup', title: 'Team standup', start: '09:15:00', end: '09:45:00' },
  { id: 'sample-vet', title: 'Vet appointment', start: '15:00:00', end: '16:00:00' },
];
/** One colour per kind of thing, so the day reads at a glance. */
const KIND = { anchor: '#E8603C', todo: '#7F77DD', habit: '#1D9E75', calendar: EVENT_BLUE };
const BLOCK_MIN_H = 38;
const BLOCK_PX = 1.8;
/** Less of a move than this is a card picked up and put back. */
const STILL_PX = 16;
/** An hour with a length in it, drawn to scale. */
const HOUR_H = 88;
const PX = HOUR_H / 60;
/** Below this a block on the timeline has room for its name only. */
const TWO_LINES_H = 50;
// ponytail: a long item draws at most two hours tall, so a nine-to-five doesn't
// push the rest of the day off the screen. Its pill still says the real length.
// Raise it, or fold the middle, if people want true scale.
const MAX_DRAWN_MIN = 120;

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const capped = (m: number | null) => (m === null ? null : Math.min(m, MAX_DRAWN_MIN));
/** The sheets hand back "HH:MM"; a to-do stores "HH:MM:00". */
const stored = (w: TodoPlace): TodoPlace => (w !== 'any' && 'at' in w ? { at: `${w.at.slice(0, 5)}:00` } : w);

/** Where a held card can be let go: after a moment, at an hour, or any time. */
type Target = { kind: 'anchor'; anchorId: string } | { kind: 'hour'; hour: number } | { kind: 'at'; minute: number; until: number } | { kind: 'any' };
const ANY: Target = { kind: 'any' };

/** My Day: the date, anytime, then the day as an hour rail. Hold anything to move it. */
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
  const { data: history = [] } = useHabitHistory(userId);
  const todo = useTodoActions(userId, day);
  const moveHabit = useMoveHabit(userId);
  const updateAnchor = useUpdateAnchor(userId);
  const deleteAnchor = useDeleteAnchor();
  const updateHabit = useUpdateHabit(userId);
  const archiveHabit = useArchiveHabit(userId);
  const { data: stacks = [] } = useAnchorLoad(userId);
  const { toggle: instant } = useInstantToggle(userId);
  // Calendar events are Pro. Read-only: they show where they fall, nothing more.
  const isPro = useIsPro();
  const { data: realEvents = [], refetch: refetchEvents } = useTodayEvents(isPro);
  // Made-up events only in development, so a release never shows someone a meeting they don't have.
  const events = ADHD && __DEV__ && realEvents.length === 0 ? SAMPLE_EVENTS : realEvents;
  // Nudges are written by somebody else, so this screen is the only thing that
  // ever goes looking for them.
  const { data: nudges = [], refetch: refetchNudges } = useNudgesForMe(userId);
  const pull = usePull(refetchDay, refetchAnchors, refetchTodos, refetchEvents, refetchNudges);

  // Setup offers the calendar without asking the phone, because it is Pro. This
  // is where Pro arrives, so this is where it asks. iOS only ever shows it once.
  const { access, loading: accessLoading } = useAccess();
  const proSettled = !accessLoading && hasAccess(access);
  useEffect(() => {
    if (!proSettled) return;
    void askForCalendar().then((granted) => {
      if (granted) void refetchEvents();
    });
  }, [proSettled, refetchEvents]);

  useFocusEffect(
    useCallback(() => {
      setToday(new Date());
      void refetchDay();
      void refetchNudges();
    }, [refetchDay, refetchNudges]),
  );

  // Home passes a fresh `opened` each time, so its buttons always land back on
  // today; the + menu's To-do passes a fresh `add`. The sheet adds to the day
  // being shown, so `add` leaves the day alone.
  const { opened, dumped, at, add } = useLocalSearchParams<{
    opened?: string;
    add?: string;
    /** Folders a brain dump just filed notes into, for the toast. */
    dumped?: string;
    at?: string;
  }>();
  const [adding, setAdding] = useState(false);
  const [seen, setSeen] = useState<{ opened?: string; add?: string }>({});
  if (opened !== seen.opened || add !== seen.add) {
    if (opened && opened !== seen.opened) setOffset(0);
    if (add && add !== seen.add) setAdding(true);
    setSeen({ opened, add });
  }

  // The date pulls down the month.
  const [monthOpen, setMonthOpen] = useState(false);
  const [month, setMonth] = useState(today);
  const toggleMonth = () => {
    if (!monthOpen) setMonth(day);
    setMonthOpen((o) => !o);
  };
  const stepMonth = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const nowHour = today.getHours();

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
  const minuteOfTodo = (t: Todo) => {
    const anchor = anchorFor(t, anchors);
    return anchor ? minutesOf(anchor.usual_time) : t.at ? minutesOf(t.at) : null;
  };
  for (const t of todos) {
    const minute = minuteOfTodo(t);
    if (minute === null) continue;
    placed.add(t.id);
    blockAt(minute).todos.push(t);
  }
  const blocks = [...byHour.values()].sort((a, b) => a.minute - b.minute);
  const anytimeHabits = habits.filter((h) => !placed.has(h.id));
  const anytimeTodos = todos.filter((t) => !placed.has(t.id));

  const eventLength = (e: DayEvent) => {
    const start = minutesOf(e.start);
    const end = minutesOf(e.end);
    // One that runs past midnight shows up to midnight.
    return end > start ? end - start : 1440 - start;
  };
  const anchorLength = (a: Anchor) => (a.ends_at ? minutesOf(a.ends_at) - minutesOf(a.usual_time) : null);

  const firstHour = Math.min(Math.floor((blocks[0]?.minute ?? 9 * 60) / 60), isToday ? nowHour : 24);
  const lastMinute = Math.max(blocks[blocks.length - 1]?.minute ?? 18 * 60, isToday ? nowMinutes : 0);
  const slots: Slot[] = [
    ...anchors.map((a) => ({ id: a.id, start: minutesOf(a.usual_time), minutes: capped(anchorLength(a)) })),
    ...(isToday ? events : []).map((e) => ({ id: e.id, start: minutesOf(e.start), minutes: capped(eventLength(e)) })),
    ...habits.filter((h) => placed.has(h.id)).map((h) => ({ id: h.id, start: h.sortKey, minutes: capped(h.minutes) })),
    ...todos
      .filter((t) => placed.has(t.id))
      .map((t) => ({ id: t.id, start: minuteOfTodo(t) ?? 0, minutes: capped(t.minutes) })),
  ];
  const spans = ADHD ? [] : laySpans(slots);
  const sampleTodo = STONES && isToday && !todos.some((t) => !t.done) ? { id: 'sample-todo', kind: 'todo' as const, start: nowHour * 60, minutes: 60, done: false } : null;
  const nextUp = ADHD && isToday
    ? pickNext(
        [
          ...(sampleTodo ? [sampleTodo] : []),
          ...events.map((e) => ({ id: e.id, kind: 'calendar' as const, start: minutesOf(e.start), minutes: eventLength(e), done: false })),
          ...todos.map((t) => ({ id: t.id, kind: 'todo' as const, start: minuteOfTodo(t), minutes: t.minutes, done: t.done })),
          ...habits.map((h) => ({ id: h.id, kind: 'habit' as const, start: placed.has(h.id) ? h.sortKey : null, minutes: h.minutes, done: h.checkedIn })),
        ],
        nowMinutes,
      )
    : null;
  const nextLine = !nextUp
    ? null
    : nextUp.state === 'in'
      ? `in ${nextUp.minute < 60 ? `${nextUp.minute} min` : formatLength(nextUp.minute)}`
      : nextUp.state === 'until'
        ? `until ${formatTime(hhmm(nextUp.minute))}`
        : nextUp.state === 'since'
          ? `since ${formatTime(hhmm(nextUp.minute))}`
          : 'any time today';
  const lookOf = (id: string, start: number | null, minutes: number | null, done: boolean) =>
    ADHD
      ? {
          scale: lengthScale(minutes),
          isNext: nextUp?.id === id,
          line: nextUp?.id === id ? nextLine : null,
          dim: isToday && !done && nextUp?.id !== id && start !== null && start + (minutes || 15) <= nowMinutes,
        }
      : undefined;
  const lastHour = Math.max(Math.ceil(lastMinute / 60), ...spans.map((s) => Math.min(s.to, 23)));
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);

  // Runs of empty hours fold into one pill. Which are open is kept per day, so
  // it starts folded on every other day.
  const busy = new Set<number>(byHour.keys());
  for (const sp of spans) for (let h = sp.from; h < sp.to; h++) busy.add(h);
  const runs = emptyRuns(firstHour, lastHour, busy, isToday ? nowHour : undefined);
  const [expanded, setExpanded] = useState<{ day: string; from: number[] }>({ day: shown, from: [] });
  const openRuns = expanded.day === shown ? expanded.from : [];
  const flipRun = (from: number) =>
    setExpanded({ day: shown, from: openRuns.includes(from) ? openRuns.filter((f) => f !== from) : [...openRuns, from] });

  const hero = habits.find((h) => !h.checkedIn)?.color ?? habitColors[0];
  const doneCount = habits.filter((h) => h.checkedIn).length;

  /** Done days in a row, up to the day shown (or the day before, if it is still open). */
  const runOf = (h: TodayHabit) => {
    const past = history.find((x) => x.habitId === h.id);
    if (!past) return 0;
    const to = h.checkedIn ? shown : shiftDate(shown, -1);
    const checkedOn = [...past.checkedOn.filter((d) => d < shown), ...(h.checkedIn ? [shown] : [])];
    return currentRun(statsFor({ ...past, checkedOn }, shiftDate(to, -365), to, to));
  };

  const colorOf = (id: string) => {
    const a = anchors.find((x) => x.id === id);
    if (a) return momentColor(a);
    const h = habits.find((x) => x.id === id);
    if (h) return h.color;
    const t = todos.find((x) => x.id === id);
    return t ? todoTint(t, anchors) : EVENT_BLUE;
  };
  const nowSlot = isToday
    ? slots.find((s) => s.minutes && s.start <= nowMinutes && nowMinutes < s.start + s.minutes)
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

  const scrollRef = useRef<ScrollView>(null);
  const scrolledToNext = useRef(false);
  const scrollToNext = () => {
    if (nextUp?.start === null || nextUp?.start === undefined) return;
    nodes.current.get(`h${Math.floor(nextUp.start / 60)}`)?.node.measureInWindow((_x, y) => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y + scrollY.current - 240), animated: true });
    });
  };
  const scrollY = useRef(0);
  // Once, on opening. The clock moving the highlight never moves the screen.
  useEffect(() => {
    if (scrolledToNext.current || !nextUp) return;
    scrolledToNext.current = true;
    setTimeout(scrollToNext, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the first Next
  }, [nextUp?.id]);

  // ponytail: preview, passes what it shows and saves nothing. Real one reads the item by id.
  const focusOn = (id: string) => {
    if (id === 'sample-todo') {
      router.push({ pathname: '/focus/[id]', params: { id, title: 'Finish tax form', emoji: '', color: KIND.todo, minutes: '60', steps: JSON.stringify(SAMPLE_TODO_STEPS), stones: STONES ? '1' : '' } });
      return;
    }
    const h = habits.find((x) => x.id === id);
    const t = todos.find((x) => x.id === id);
    if (!h && !t) return scrollToNext();
    const title = h?.name ?? t?.title ?? '';
    const steps = t ? (t.steps.length > 0 ? t.steps.map((x) => x.title) : (SAMPLE_STEPS[t.title] ?? ['Open it up', 'Do the first small bit', 'Wrap it up'])) : [];
    router.push({
      pathname: '/focus/[id]',
      params: { id, title, emoji: guessEmoji(title), color: h ? KIND.habit : KIND.todo, minutes: String((h?.minutes ?? t?.minutes) || 15), steps: JSON.stringify(steps), stones: STONES ? '1' : '' },
    });
  };

  const stoneOf = (id: string, title: string, kind: StoneItem['kind'], start: number, minutes: number | null, done: boolean): StoneItem => ({
    id,
    title,
    kind,
    start,
    minutes,
    done,
    emoji: kind === 'habit' || kind === 'todo' ? guessEmoji(title) : '',
    isNext: nextUp?.id === id,
    line: nextUp?.id === id ? nextLine : null,
    missed: isToday && !done && kind !== 'anchor' && kind !== 'calendar' && nextUp?.id !== id && start + (minutes || 15) <= nowMinutes,
  });
  const stoneItems: StoneItem[] = [
    ...anchors.map((a) => stoneOf(a.id, a.label, 'anchor', minutesOf(a.usual_time), null, false)),
    ...(isToday ? events : []).map((e) => stoneOf(e.id, e.title, 'calendar', minutesOf(e.start), eventLength(e), false)),
    ...habits.filter((h) => placed.has(h.id)).map((h) => stoneOf(h.id, h.name, 'habit', h.sortKey, h.minutes, h.checkedIn)),
    ...todos.filter((t) => placed.has(t.id)).map((t) => stoneOf(t.id, t.title, 'todo', minuteOfTodo(t) ?? 0, t.minutes, t.done)),
    ...(sampleTodo ? [stoneOf(sampleTodo.id, 'Finish tax form', 'todo', sampleTodo.start, 60, false)] : []),
  ].sort((a, b) => a.start - b.start || Number(b.kind === 'anchor') - Number(a.kind === 'anchor'));

  const register = (key: string, target: Target) => (node: View | null) => {
    if (node) nodes.current.set(key, { node, target });
    else nodes.current.delete(key);
  };

  // Measured once the lift has rendered, so the anytime panel and the hours it
  // unfolds are measured too.
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
    `|${anytimeHabits.map((h) => h.id)}:${anytimeTodos.map((t) => t.id)}` +
    `|${spans.map((sp) => `${sp.from}-${sp.to}:${sp.items.map((i) => `${i.id}@${i.lane}`)}`)}`;
  const [moving, setMoving] = useState(false);
  const [drawn, setDrawn] = useState(order);
  if (order !== drawn) {
    if (moving) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMoving(false);
    }
    setDrawn(order);
  }

  const [dropY] = useState(() => new Animated.Value(0));
  const [dropLabel, setDropLabel] = useState<string | null>(null);
  const heldFrom = useRef<number | null>(null);
  /** Where a card let go at y would land; a line's row reads as a time. */
  const spotAt = (y: number): Target | undefined => {
    if (Math.abs(y - (heldFrom.current ?? y)) < STILL_PX) return undefined;
    const r = findRect(y);
    return r?.target.kind === 'at'
      ? { ...r.target, minute: minuteAt(r.target.minute, r.target.until, (y - r.top) / (r.bottom - r.top)) }
      : r?.target;
  };
  const spotLabel = (t: Target | undefined) => {
    if (t?.kind === 'at') return clock(t.minute);
    if (t?.kind !== 'anchor') return null;
    const a = anchors.find((x) => x.id === t.anchorId);
    return a ? copy.myDay.dropOnMoment(a.label) : null;
  };

  const dragFor = (id: string, place: (target: Target) => void): Drag => ({
    onPickUp: () => {
      setError(null);
      setCarried(id);
    },
    onHover: (y) => {
      heldFrom.current ??= y;
      const key = findRect(y)?.key ?? null;
      setHovered((k) => (k === key ? k : key));
      dropY.setValue(y);
      const label = spotLabel(spotAt(y));
      setDropLabel((l) => (l === label ? l : label));
    },
    onDrop: (y) => {
      const target = spotAt(y);
      if (target) place(target);
    },
    onRelease: () => {
      heldFrom.current = null;
      setCarried(null);
      setHovered(null);
      setDropLabel(null);
    },
  });

  const placeHabit = (h: TodayHabit) => (t: Target) => {
    // Let go where it already was: nothing to do. Without this, putting a
    // 7:30 habit back on its own hour would quietly move it to 7:00.
    const same =
      t.kind === 'at'
        ? h.mode === 'at' && h.sortKey === t.minute
        : t.kind === 'anchor'
          ? h.mode === 'after' && h.anchorId === t.anchorId
          : t.kind === 'hour'
            ? h.mode === 'at' && Math.floor(h.sortKey / 60) === t.hour
            : h.mode === 'any';
    if (same) return;
    setMoving(true);
    moveHabit.mutate(
      t.kind === 'at'
        ? { habitId: h.id, mode: 'at', atTime: hhmm(t.minute) }
        : t.kind === 'anchor'
        ? { habitId: h.id, mode: 'after', anchorId: t.anchorId }
        : t.kind === 'hour'
          ? { habitId: h.id, mode: 'at', atTime: `${pad(t.hour)}:00` }
          : { habitId: h.id, mode: 'any' },
      { onError: () => setError(copy.myDay.moveFailed) },
    );
  };

  const placeTodo = (td: Todo) => (t: Target) => {
    const same =
      t.kind === 'at'
        ? !td.anchorId && minuteOfTodo(td) === t.minute
        : t.kind === 'anchor'
        ? td.anchorId === t.anchorId
        : t.kind === 'hour'
          ? !td.anchorId && td.at !== null && Number(td.at.slice(0, 2)) === t.hour
          : !td.anchorId && !td.at;
    if (same) return;
    setMoving(true);
    todo.move(td, t.kind === 'at' ? { at: `${hhmm(t.minute)}:00` } : t.kind === 'anchor' ? { anchorId: t.anchorId } : t.kind === 'hour' ? { at: `${pad(t.hour)}:00:00` } : 'any');
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
    const delta = t.kind === 'at' ? t.minute - minutesOf(a.usual_time) : hour === null ? 0 : (hour - was) * 60;
    if (delta === 0) return;
    const shift = (time: string) => hhmm((((minutesOf(time) + delta) % 1440) + 1440) % 1440);
    setMoving(true);
    updateAnchor.mutate(
      { id: a.id, label: a.label, usualTime: shift(a.usual_time), endsAt: a.ends_at && shift(a.ends_at), color: a.color },
      { onError: () => setError(copy.myDay.moveFailed) },
    );
  };

  // --- editing ----------------------------------------------------------------

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
  const saveHabit = ({ title, when, days = [], color, minutes }: ItemEdit) => {
    if (!editingHabit) return;
    setMoving(true);
    updateHabit.mutate(
      {
        habitId: editingHabit.id,
        name: title,
        color,
        daysOfWeek: days,
        ...(when === 'any'
          ? { mode: 'any' as const }
          : 'anchorId' in when
            ? { mode: 'after' as const, anchorId: when.anchorId }
            : { mode: 'at' as const, atTime: when.at.slice(0, 5) }),
        // Only when it changed, so nothing else ever writes to the column.
        ...(minutes !== editingHabit.minutes ? { durationMinutes: minutes } : {}),
      },
      { onSuccess: closeSheets, onError: () => setSheetError(copy.myDay.edit.saveFailed) },
    );
  };
  const saveTodo = ({ title, when, minutes }: ItemEdit) => {
    if (!editingTodo) return;
    const t = editingTodo;
    const place = stored(when);
    const was: TodoPlace = t.anchorId ? { anchorId: t.anchorId } : t.at ? { at: t.at } : 'any';
    if (title !== t.title) todo.rename(t, title);
    if (JSON.stringify(place) !== JSON.stringify(was)) {
      setMoving(true);
      todo.move(t, place);
    }
    if (minutes !== t.minutes) todo.setLength(t, minutes);
    closeSheets();
  };
  const addTodo = (title: string, when: TodoPlace, minutes: number | null) => {
    setAdding(false);
    // Free holds five open at once.
    if (!isPro && todos.filter((t) => !t.done).length >= FREE_TODOS) return showUpgrade();
    todo.add(title, stored(when), minutes);
  };

  // --- drawing ----------------------------------------------------------------

  /** The row holding the carried card draws above the rows after it. */
  const lifted = (ids: string[]) => carried !== null && ids.includes(carried) && styles.lifted;

  // Rows are keyed by day too: kept across a day change, a row done on one
  // day and not the other played its check-off as if just tapped.
  const habitItem = (h: TodayHabit, height?: number, narrow?: boolean) => (
    <HabitItem
      key={`${shown}:${h.id}`}
      habit={ONE_LINE ? { ...h, color: KIND.habit } : h}
      look={lookOf(h.id, placed.has(h.id) ? h.sortKey : null, h.minutes, h.checkedIn)}
      run={runOf(h)}
      drag={dragFor(h.id, placeHabit(h))}
      onToggle={() => toggle(h)}
      onEdit={() => setEditingHabit(h)}
      height={height}
      narrow={narrow}
    />
  );
  const todoItem = (t: Todo, height?: number, narrow?: boolean) => {
    const minute = minuteOfTodo(t);
    return (
      <TodoItem
        key={`${shown}:${t.id}`}
        todo={t}
        tint={ONE_LINE ? KIND.todo : todoTint(t, anchors)}
        look={lookOf(t.id, minute, t.minutes, t.done)}
        current={isToday && minute !== null && Math.floor(minute / 60) === nowHour}
        carried={carriedLabel(t.day, shown)}
        drag={dragFor(t.id, placeTodo(t))}
        onToggle={() => todo.toggle(t)}
        onEdit={() => setEditingTodo(t)}
        height={height}
        narrow={narrow}
      />
    );
  };
  const eventLine = (e: DayEvent, height?: number, narrow = false) => (
    <View key={e.id} style={[styles.event, { minHeight: sized(eventLength(e)) }, height !== undefined && { height, minHeight: 0, paddingVertical: 4 }, nextUp?.id === e.id && styles.eventNext, ADHD && isToday && minutesOf(e.end) <= nowMinutes && { opacity: 0.6 }]}>
      <CalendarIcon size={14} color={INK} />
      <Text numberOfLines={1} style={styles.eventTitle}>
        {e.title}
      </Text>
      {nextUp?.id === e.id && <Text style={styles.eventNextLine}>{nextLine}</Text>}
      {!narrow && <LengthPill minutes={eventLength(e)} onLoud />}
    </View>
  );

  /** A moment's line, and under it what is stacked after it. */
  const anchorStack = (a: Anchor, stackHabits: TodayHabit[] = [], stackTodos: Todo[] = []) => {
    const color = loud(momentColor(a));
    const key = `a${a.id}`;
    const total = stackHabits.length + stackTodos.length;
    const done = stackHabits.filter((h) => h.checkedIn).length + stackTodos.filter((t) => t.done).length;
    const length = anchorLength(a);
    return (
      <View key={a.id} ref={register(key, { kind: 'anchor', anchorId: a.id })} collapsable={false}>
        <Lift onTap={() => openMoment(a)} drag={dragFor(a.id, placeMoment(a))}>
          <View style={styles.anchorLine}>
            <View style={[styles.anchorDot, { backgroundColor: color }]} />
            <Text style={styles.anchorEmoji}>{emojiFor(a.label)}</Text>
            <Text numberOfLines={1} style={[styles.anchorLabel, styles.anchorWord, { color }]}>
              {a.label}
            </Text>
            {total > 0 && <Text style={styles.anchorCount}>{copy.myDay.ring(done, total)}</Text>}
            <View style={{ flex: 1 }} />
            {length !== null && length > 0 && <LengthPill minutes={length} />}
            <EditDots label={`Edit ${a.label}`} onPress={() => openMoment(a)} color={color} />
          </View>
        </Lift>
        {total > 0 && (
          <View style={[styles.stacked, { borderLeftColor: alpha(color, 0.6) }]}>
            {ADHD && stackTodos.map((t) => todoItem(t))}
            {stackHabits.map((h) => habitItem(h))}
            {!ADHD && stackTodos.map((t) => todoItem(t))}
          </View>
        )}
        {/* Drawn over what follows, so showing it moves nothing that was measured. */}
        {carried !== null && carried !== a.id && hovered === key && (
          <View pointerEvents="none" style={styles.dropSlot}>
            <Text style={styles.dropText}>{copy.myDay.dropTo(copy.myDay.dropOnMoment(a.label))}</Text>
          </View>
        )}
      </View>
    );
  };

  const nowLine = (top: DimensionValue) => (
    <View pointerEvents={ADHD ? 'box-none' : 'none'} style={[styles.now, { top }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Focus on what's next"
        onPress={() => nextUp && focusOn(nextUp.id)}
        style={[styles.nowPill, { backgroundColor: nowSlot ? loud(colorOf(nowSlot.id)) : colors.textMuted }]}
      >
        <Text style={[styles.nowText, { color: nowSlot ? INK : colors.bg }]}>
          {copy.myDay.nowAt(formatTime(`${pad(nowHour)}:${pad(today.getMinutes())}`).replace(/ [AP]M$/, ''))}
        </Text>
      </Pressable>
      <View pointerEvents="none" style={[styles.nowRule, { borderColor: nowSlot ? loud(colorOf(nowSlot.id)) : colors.textMuted }]} />
    </View>
  );

  // The NOW pill takes the current hour's place in the gutter.
  const hourMark = (h: number) => (
    <View style={styles.hour}>
      {!(isToday && h === nowHour) && (
        <Text numberOfLines={1} style={styles.hourText}>
          {hourLabel(h)}
        </Text>
      )}
    </View>
  );

  const hourRow = (h: number) => {
    const b = byHour.get(h);
    const key = `h${h}`;
    const stackedOn = (anchorId: string | null) => b?.anchors.some((a) => a.id === anchorId) ?? false;
    const looseHabits = b?.habits.filter((x) => !(x.mode === 'after' && stackedOn(x.anchorId))) ?? [];
    const looseTodos = b?.todos.filter((t) => !stackedOn(t.anchorId)) ?? [];
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
        {hourMark(h)}
        <View style={styles.placed}>
          {b?.anchors.map((a) =>
            anchorStack(
              a,
              b.habits.filter((x) => x.mode === 'after' && x.anchorId === a.id),
              b.todos.filter((t) => t.anchorId === a.id),
            ),
          )}
          {b?.events.map((e) => eventLine(e))}
          {ADHD && looseTodos.map((t) => todoItem(t))}
          {looseHabits.map((x) => habitItem(x))}
          {!ADHD && looseTodos.map((t) => todoItem(t))}
        </View>
        {/* On the hour's top edge, not minutes-down: this row is as tall as what's
            in it, so a minutes share landed on whatever card or label sat there. */}
        {isToday && h === nowHour && nowLine(0)}
      </View>
    );
  };

  /** Whatever sits in a to-scale span, in a lane, at the height it was given. */
  const drawInSpan = (id: string, height: number, lanes: number): ReactNode => {
    const narrow = lanes > 1;
    const a = anchors.find((x) => x.id === id);
    if (a) {
      const length = anchorLength(a);
      // A moment with no length is a line everywhere, even sharing the width.
      if (!length) return anchorStack(a);
      const color = momentColor(a);
      return (
        <Lift key={a.id} onTap={() => openMoment(a)} drag={dragFor(a.id, placeMoment(a))}>
          <View
            ref={register(`a${a.id}`, { kind: 'anchor', anchorId: a.id })}
            collapsable={false}
            style={[
              styles.block,
              { height, borderLeftColor: color, backgroundColor: alpha(color, hovered === `a${a.id}` ? 0.34 : 0.2) },
            ]}
          >
            <Text numberOfLines={1} style={[styles.eventTitle, { flex: 0, color: colors.text }]}>{`${emojiFor(a.label)} ${a.label}`}</Text>
            {height >= TWO_LINES_H && !narrow ? <LengthPill minutes={length} /> : null}
          </View>
        </Lift>
      );
    }
    const e = isToday ? events.find((x) => x.id === id) : undefined;
    if (e) return eventLine(e, height, narrow);
    const h = habits.find((x) => x.id === id);
    if (h) return habitItem(h, height, narrow);
    const t = todos.find((x) => x.id === id);
    return t ? todoItem(t, height, narrow) : null;
  };

  const spanRow = (span: Span) => (
    // collapsable={false}, here and on each lane: a plain view gets folded into
    // its parent, and the zIndex a pickup adds unfolds it, moving the held card
    // to a new native parent mid-touch, which cancels the drag.
    <View
      key={span.from}
      collapsable={false}
      style={[{ height: (span.end - span.from * 60) * PX }, lifted(span.items.map((i) => i.id))]}
    >
      {Array.from({ length: span.to - span.from }, (_, i) => span.from + i).map((h) => (
        <View
          key={h}
          ref={register(`h${h}`, { kind: 'hour', hour: h })}
          collapsable={false}
          style={[styles.spanHour, { top: (h - span.from) * HOUR_H }, hovered === `h${h}` && styles.hover]}
        >
          {hourMark(h)}
          <View style={styles.spanRule} />
        </View>
      ))}
      <View pointerEvents="box-none" style={styles.lanes}>
        {span.items.map((item) => (
          <View
            key={item.id}
            collapsable={false}
            pointerEvents="box-none"
            style={[
              styles.lane,
              {
                top: (item.start - span.from * 60) * PX,
                left: `${(item.lane / item.lanes) * 100}%`,
                width: `${100 / item.lanes}%`,
              },
              carried === item.id && styles.lifted,
            ]}
          >
            {drawInSpan(item.id, (item.end - item.start) * PX - 2, item.lanes)}
          </View>
        ))}
      </View>
      {isToday && nowHour >= span.from && nowHour < span.to && nowLine((nowMinutes - span.from * 60) * PX)}
    </View>
  );

  const foldPill = (run: { from: number; to: number }, open: boolean) => {
    const n = run.to - run.from;
    return (
      <Pressable
        key={`run${run.from}`}
        accessibilityRole="button"
        onPress={() => flipRun(run.from)}
        style={[styles.fold, open && styles.foldOpen]}
      >
        <MoonIcon size={14} color={colors.textFaint} />
        <Text style={styles.foldText}>{open ? copy.myDay.emptyShown(n) : copy.myDay.emptyHidden(n)}</Text>
        <Text style={styles.foldAction}>{open ? copy.myDay.collapse : copy.myDay.expand}</Text>
      </Pressable>
    );
  };

  // A sideways swipe steps a day. Off while a card is held, so moving one
  // never changes the day under it.
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .enabled(carried === null)
    .activeOffsetX([-30, 30])
    .failOffsetY([-15, 15])
    .onEnd((e) => setOffset((o) => o + (e.translationX < 0 ? 1 : -1)));

  // --- the one-line preview ----------------------------------------------------

  const [lineOpen, setLineOpen] = useState<string | null>(null);
  const [stepsDone, setStepsDone] = useState<string[]>([]);
  const lineEvents = !isToday ? [] : events.length > 0 || !__DEV__ ? events : SAMPLE_EVENTS;
  const lineRows = lineUp(
    [
      ...anchors.map((a) => ({ id: a.id, start: minutesOf(a.usual_time), minutes: anchorLength(a), rank: 0 })),
      ...lineEvents.map((e) => ({ id: e.id, start: minutesOf(e.start), minutes: eventLength(e), rank: 1 })),
      ...habits.filter((h) => placed.has(h.id)).map((h) => ({ id: h.id, start: h.sortKey, minutes: h.minutes, rank: 2 })),
      ...todos.filter((t) => placed.has(t.id)).map((t) => ({ id: t.id, start: minuteOfTodo(t) ?? 0, minutes: t.minutes, rank: 3 })),
    ],
    isToday ? nowMinutes : undefined,
  );
  const stepsOf = (t: Todo) => (t.steps.length > 0 ? t.steps.map((s) => s.title) : (SAMPLE_STEPS[t.title] ?? []));
  // The one you're on opens by itself: the first unfinished to-do with steps, not yet over.
  const onItNow = todos.find(
    (t) => placed.has(t.id) && !t.done && stepsOf(t).length > 0 && (minuteOfTodo(t) ?? 0) + (t.minutes ?? 0) >= (isToday ? nowMinutes : 0),
  )?.id;
  const clock = (m: number) => formatTime(hhmm(m)).replace(/ [AP]M$/, '');
  const rowSpans = lineSpans(lineRows, isToday ? nowMinutes : 0);

  const onLine = (key: string, target: Target, time: string | null, body: ReactNode, id?: string) => (
    <View
      key={key}
      ref={register(`r${key}`, target)}
      collapsable={false}
      style={[styles.lineRow, id !== undefined && carried === id && styles.lifted]}
    >
      <Text style={[styles.lineTime, target.kind === 'anchor' && styles.lineTimeAnchor]}>{time}</Text>
      <View style={styles.lineBody}>{body}</View>
    </View>
  );
  const block = (color: string, minutes: number | null, done: boolean, body: ReactNode) => (
    <View
      style={[
        styles.lineBlock,
        {
          minHeight: Math.max(BLOCK_MIN_H, Math.min(minutes ?? 0, MAX_DRAWN_MIN) * BLOCK_PX),
          backgroundColor: alpha(color, done ? 0.8 : 0.3),
        },
      ]}
    >
      {body}
    </View>
  );
  const named = (emoji: string | null | undefined, name: string, done: boolean, bold = false) => (
    <Text numberOfLines={1} style={[styles.lineName, bold && styles.lineTodoName, done && styles.lineDone]}>
      {emoji ? `${emoji}  ` : ''}
      {name}
    </Text>
  );

  const drawLine = (row: LineRow, i: number): ReactNode => {
    const span = rowSpans[i] ?? { from: 0, to: 0 };
    const target: Target = { kind: 'at', minute: span.from, until: span.to };
    if (row.kind === 'now') {
      return onLine('now', target, null, <Text style={[styles.lineNowText, { color: hero }]}>{copy.myDay.nowAt(clock(nowMinutes))}</Text>);
    }
    if (row.kind === 'free') {
      return onLine(`free${i}`, target, null, <Text style={styles.lineFree}>{copy.myDay.freeTime(formatLength(row.minutes))}</Text>);
    }
    const time = clock(row.start);
    const a = anchors.find((x) => x.id === row.id);
    if (a) {
      return onLine(
        a.id,
        { kind: 'anchor', anchorId: a.id },
        time,
        <Lift onTap={() => openMoment(a)} drag={dragFor(a.id, placeMoment(a))}>
          <View style={styles.lineRowInner}>
            <View style={[styles.tick, { backgroundColor: KIND.anchor }]} />
            <Text style={styles.anchorEmoji}>{emojiFor(a.label)}</Text>
            <Text numberOfLines={1} style={styles.anchorLabel}>
              {a.label}
            </Text>
            <View style={{ flex: 1 }} />
            <EditDots label={`Edit ${a.label}`} onPress={() => openMoment(a)} />
          </View>
        </Lift>,
        a.id,
      );
    }
    const e = lineEvents.find((x) => x.id === row.id);
    if (e) {
      return onLine(
        e.id,
        target,
        time,
        <View style={styles.lineLocked}>
          {block(
            KIND.calendar,
            eventLength(e),
            false,
            <View style={styles.lineRowInner}>
              {named('📅', e.title, false)}
              <View style={{ flex: 1 }} />
              <LengthPill minutes={eventLength(e)} />
              <Text style={styles.lineLock}>🔒</Text>
            </View>,
          )}
        </View>,
      );
    }
    const h = habits.find((x) => x.id === row.id);
    if (h) {
      const run = runOf(h);
      return onLine(
        h.id,
        target,
        time,
        <Lift onTap={() => toggle(h)} drag={dragFor(h.id, placeHabit(h))}>
          {block(
            KIND.habit,
            h.minutes,
            h.checkedIn,
            <View style={styles.lineRowInner}>
              {named(guessEmoji(h.name), h.name, h.checkedIn)}
              <View style={{ flex: 1 }} />
              {run >= 2 && <Text style={styles.lineMeta}>{copy.myDay.daysInARow(run)}</Text>}
              {h.minutes ? <LengthPill minutes={h.minutes} /> : null}
              <EditDots label={`Edit ${h.name}`} onPress={() => setEditingHabit(h)} />
            </View>,
          )}
        </Lift>,
        h.id,
      );
    }
    const t = todos.find((x) => x.id === row.id);
    if (!t) return null;
    const steps = stepsOf(t);
    const open = steps.length > 0 && (lineOpen === t.id || (lineOpen === null && onItNow === t.id));
    const stepKey = (n: number) => `${t.id}:${n}`;
    const head = (
      <View style={styles.lineRowInner}>
        {named(guessEmoji(t.title), t.title, t.done, true)}
        <View style={{ flex: 1 }} />
        {t.minutes ? <LengthPill minutes={t.minutes} /> : null}
        {steps.length > 0 && (
          <>
            <Text style={styles.lineMeta}>{copy.myDay.ring(steps.filter((_, n) => stepsDone.includes(stepKey(n))).length, steps.length)}</Text>
            <View style={open && styles.lineUpsideDown}>
              <ChevronIcon size={16} color={colors.textMuted} />
            </View>
          </>
        )}
        <EditDots label={`Edit ${t.title}`} onPress={() => setEditingTodo(t)} />
      </View>
    );
    // A step takes its own taps, so an open to-do is held by its top line.
    const lift = (body: ReactNode) => (
      <Lift onTap={() => (steps.length > 0 ? setLineOpen(open ? '' : t.id) : todo.toggle(t))} drag={dragFor(t.id, placeTodo(t))}>
        {body}
      </Lift>
    );
    return onLine(
      t.id,
      target,
      time,
      open
        ? block(
            KIND.todo,
            t.minutes,
            t.done,
            <>
              {lift(head)}
              {steps.map((title, n) => {
                const done = stepsDone.includes(stepKey(n));
                const flip = () => setStepsDone((d) => (done ? d.filter((k) => k !== stepKey(n)) : [...d, stepKey(n)]));
                return (
                  <Pressable key={n} accessibilityRole="checkbox" accessibilityState={{ checked: done }} style={styles.lineStep} onPress={flip}>
                    <View style={[styles.lineCheck, { borderColor: KIND.todo, backgroundColor: done ? KIND.todo : 'transparent' }]}>
                      {done && <Text style={styles.lineTick}>✓</Text>}
                    </View>
                    <Text numberOfLines={1} style={[styles.lineStepText, done && styles.lineDone]}>
                      {title}
                    </Text>
                  </Pressable>
                );
              })}
            </>,
          )
        : lift(block(KIND.todo, t.minutes, t.done, head)),
      t.id,
    );
  };

  const lineKey = (
    <View style={styles.lineKey}>
      {(['anchor', 'todo', 'habit', 'calendar'] as const).map((k) => (
        <View key={k} style={styles.lineKeyItem}>
          <View style={[styles.lineKeyDot, { backgroundColor: KIND[k] }]} />
          <Text style={styles.lineKeyText}>{copy.myDay.kinds[k]}</Text>
        </View>
      ))}
    </View>
  );

  const anyTotal = anytimeHabits.length + anytimeTodos.length;
  const anyDone = anytimeHabits.filter((h) => h.checkedIn).length + anytimeTodos.filter((t) => t.done).length;

  return (
    <View style={styles.root}>
      <Bleed color={hero} />
      {PEAKS && isToday && (
        <>
          <Image source={require('../../../assets/backdrop.jpg')} style={[StyleSheet.absoluteFill, { opacity: 0.85 }]} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(40,18,14,0.28)' }]} />
        </>
      )}
      <GestureDetector gesture={swipe}>
        <ScrollView
          ref={scrollRef}
          onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={64}
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
          {dumped !== undefined && <DumpToast key={at} folders={dumped} />}

          {nudges
            .filter((nudge) => !nudge.checkedIn)
            .map((nudge) => (
              <Pressable
                key={nudge.id}
                accessibilityRole="button"
                accessibilityLabel={`${copy.nudge.from(nudge.fromName)}: ${nudge.message}`}
                onPress={() => router.push({ pathname: '/nudge/[id]', params: { id: nudge.id } })}
                style={({ pressed }) => [styles.nudge, pressed && { opacity: 0.9 }]}
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
                <View style={[styles.nudgeDot, { backgroundColor: nudge.habitColor }]} />
              </Pressable>
            ))}

          <FirstTimeHint id="myday-move-2">{copy.myDay.moveTip}</FirstTimeHint>

          <View style={styles.head}>
            <Pressable
              style={styles.date}
              accessibilityRole="button"
              accessibilityState={{ expanded: monthOpen }}
              accessibilityLabel={day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              onPress={toggleMonth}
            >
              <Text style={styles.dateDay}>{day.toLocaleDateString('en-US', { weekday: 'long' })}</Text>
              <View style={styles.dateRow}>
                <Text style={styles.dateBig}>{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                <View style={monthOpen && styles.flip}>
                  <ChevronIcon size={18} color={colors.textMuted} />
                </View>
              </View>
            </Pressable>
            {!isToday && (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  setOffset(0);
                  setMonthOpen(false);
                }}
                style={styles.todayPill}
              >
                <Text style={styles.todayText}>{copy.myDay.today}</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            {habits.length > 0 && (
              <View style={styles.ring} accessible accessibilityLabel={copy.myDay.ringLabel(doneCount, habits.length)}>
                <ProgressRing
                  size={56}
                  strokeWidth={6}
                  progress={doneCount / habits.length}
                  color={hero}
                  trackColor={alpha(hero, 0.2)}
                />
                <Text style={styles.ringText}>{copy.myDay.ring(doneCount, habits.length)}</Text>
              </View>
            )}
            <RoundButton label={copy.myDay.editRoutine} onPress={() => router.push('/schedule')}>
              <DotsIcon color={colors.text} />
            </RoundButton>
          </View>

          {monthOpen && (
            <View style={styles.month}>
              <View style={styles.monthHead}>
                <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={12} onPress={() => stepMonth(-1)}>
                  <Text style={styles.monthArrow}>‹</Text>
                </Pressable>
                <Text style={styles.monthTitle}>
                  {month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={12} onPress={() => stepMonth(1)}>
                  <Text style={styles.monthArrow}>›</Text>
                </Pressable>
              </View>
              <MonthGrid
                month={month}
                today={today}
                shown={day}
                history={history}
                onPick={(d) => {
                  setOffset(daysFrom(today, d));
                  setMonthOpen(false);
                }}
              />
            </View>
          )}

          <View pointerEvents={monthOpen ? 'none' : 'auto'} style={[styles.dayBody, monthOpen && styles.dim]}>
            {anchors.length === 0 && <Text style={styles.empty}>{copy.myDay.empty}</Text>}
            {error && <Text style={styles.error}>{error}</Text>}

            {/* While something is held it is always there, so there is always
                somewhere to take a card off the clock. */}
            {!((STACK || PEAKS) && isToday) && (anyTotal > 0 || carried !== null) && (
              <View
                ref={register('any', ANY)}
                collapsable={false}
                style={[
                  styles.any,
                  hovered === 'any' && styles.anyOn,
                  lifted([...anytimeHabits.map((h) => h.id), ...anytimeTodos.map((t) => t.id)]),
                ]}
              >
                <View style={styles.anyHead}>
                  <Text style={styles.anyTitle}>{copy.myDay.anytimePanel}</Text>
                  <Text style={styles.anySub}>{copy.myDay.noSetTime}</Text>
                  <View style={{ flex: 1 }} />
                  {anyTotal > 0 && <Text style={styles.anyCount}>{copy.myDay.ring(anyDone, anyTotal)}</Text>}
                </View>
                {anytimeHabits.map((h) => habitItem(h))}
                {anytimeTodos.map((t) => todoItem(t))}
                {anyTotal === 0 && <Text style={styles.anyDrop}>{copy.myDay.dropAnytime}</Text>}
              </View>
            )}

            {/* One row per hour, in normal flow: a row is as tall as what is in
                it, so nothing is measured and nothing is repositioned while a
                card animates. Runs of empty hours fold away, and unfold while a
                card is held so every hour can take it. */}
            {PEAKS && isToday ? (
              <Peaks onCarry={setCarried} />
            ) : STACK && isToday ? (
              <Stack onStart={() => focusOn('sample-todo')} onCarry={setCarried} />
            ) : STONES ? (
              <Stones
                items={stoneItems}
                colors={KIND}
                now={isToday ? nowMinutes : null}
                nowLabel={copy.myDay.nowAt(formatTime(`${pad(nowHour)}:${pad(today.getMinutes())}`).replace(/ [AP]M$/, ''))}
                onPress={focusOn}
                nextRef={nextUp?.start != null ? register(`h${Math.floor(nextUp.start / 60)}`, { kind: 'hour', hour: Math.floor(nextUp.start / 60) }) : undefined}
              />
            ) : ONE_LINE ? <View>{lineKey}{lineRows.map(drawLine)}</View> : <View>
              {hours.map((h) => {
                const span = spans.find((sp) => h >= sp.from && h < sp.to);
                if (span) return h === span.from ? spanRow(span) : null;
                const run = runs.find((r) => h >= r.from && h < r.to);
                if (run && carried === null) {
                  const open = openRuns.includes(run.from);
                  if (!open) return h === run.from ? foldPill(run, false) : null;
                  if (h === run.from)
                    return (
                      <Fragment key={h}>
                        {foldPill(run, true)}
                        {hourRow(h)}
                      </Fragment>
                    );
                }
                return hourRow(h);
              })}
            </View>}
          </View>
        </ScrollView>
      </GestureDetector>

      {/* Always mounted: adding a view mid-drag can cancel the held touch. */}
      <Animated.View pointerEvents="none" style={[styles.dropLine, { opacity: ONE_LINE && dropLabel ? 1 : 0, transform: [{ translateY: dropY }] }]}>
        <Text style={styles.dropLineText}>{dropLabel}</Text>
        <View style={styles.dropLineRule} />
      </Animated.View>

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
        <ItemSheet
          kind="habit"
          habit={editingHabit}
          anchors={anchors}
          tint={editingHabit.color}
          busy={updateHabit.isPending || archiveHabit.isPending}
          error={sheetError}
          onSave={saveHabit}
          onFocus={ADHD ? () => { const id = editingHabit.id; closeSheets(); focusOn(id); } : undefined}
          onDelete={() =>
            archiveHabit.mutate(editingHabit.id, {
              onSuccess: closeSheets,
              onError: () => setSheetError(copy.myDay.edit.saveFailed),
            })
          }
          onMore={() => {
            closeSheets();
            router.push({ pathname: '/new-habit', params: { id: editingHabit.id } });
          }}
          onClose={closeSheets}
        />
      )}
      {editingTodo && (
        <ItemSheet
          kind="todo"
          todo={editingTodo}
          anchors={anchors}
          tint={todoTint(editingTodo, anchors)}
          onSave={saveTodo}
          onFocus={ADHD ? () => { const id = editingTodo.id; closeSheets(); focusOn(id); } : undefined}
          onDelete={() => {
            todo.remove(editingTodo);
            closeSheets();
          }}
          onClose={closeSheets}
        />
      )}
      {adding && <AddTodoSheet anchors={anchors} onSave={addTodo} onClose={() => setAdding(false)} />}
    </View>
  );
}

/** One line after a brain dump says where things went, then goes. */
function DumpToast({ folders }: { folders: string }) {
  const styles = useStyles(makeStyles);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <Reveal>
      <Text style={styles.toast}>{copy.brainDump.filed(folders ? folders.split(',') : [])}</Text>
    </Reveal>
  );
}

const makeStyles = (colors: Palette) =>
  ({
    root: { flex: 1, backgroundColor: colors.bg },
    head: { flexDirection: 'row', alignItems: 'center' },
    date: { paddingRight: spacing.md },
    dateDay: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.textMuted },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateBig: { ...display(34, 34), textTransform: 'uppercase', color: colors.text },
    flip: { transform: [{ rotate: '180deg' }] },
    todayPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.raised,
      borderWidth: 1,
      borderColor: colors.cardEdge,
    },
    todayText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
    ring: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    ringText: { position: 'absolute', fontFamily: fonts.bodyBold, fontSize: 11, color: colors.text },
    month: { gap: 8 },
    monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
    monthTitle: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, color: colors.text },
    monthArrow: { fontFamily: fonts.bodyMedium, fontSize: 24, lineHeight: 26, color: colors.textMuted },
    dayBody: { gap: 12 },
    dim: { opacity: 0.35 },
    nudge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: 14,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardEdge,
    },
    nudgeAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    nudgeInitials: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.white },
    nudgeFrom: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
    nudgeMessage: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
    nudgeDot: { width: 8, height: 8, borderRadius: 4 },
    empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textMuted },
    error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: habitColors[1] },
    lifted: { zIndex: 10 },
    any: {
      gap: 8,
      padding: 10,
      marginBottom: 14,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.32)',
      borderWidth: 1,
      borderColor: colors.cardEdge,
    },
    anyOn: { borderColor: alpha(colors.text, 0.45) },
    anyHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 4, paddingTop: 2 },
    anyTitle: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: colors.text },
    anySub: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
    anyCount: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
    anyDrop: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 14 },
    // The outline is always there, see-through, so showing it moves nothing.
    hover: { borderColor: alpha(colors.text, 0.35) },
    hourRow: { flexDirection: 'row', minHeight: 34, paddingVertical: 4, borderWidth: 1, borderColor: 'transparent', borderRadius: 16 },
    hour: { width: GUTTER, marginLeft: -6, alignItems: 'center', paddingTop: 5 },
    hourText: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
    placed: { flex: 1, gap: 6 },
    anchorLine: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26 },
    tick: { width: 3, height: 13, borderRadius: 2 },
    lineRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
    lineTime: { width: 40, textAlign: 'right', paddingTop: 13, fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
    lineTimeAnchor: { paddingTop: 9 },
    lineBody: { flex: 1, minWidth: 0, paddingVertical: 3, justifyContent: 'center' },
    lineRowInner: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26 },
    lineBlock: { borderRadius: 11, paddingVertical: 6, paddingHorizontal: 11 },
    lineLocked: { borderRadius: 11, borderWidth: 1, borderColor: alpha(EVENT_BLUE, 0.7) },
    lineLock: { fontSize: 10 },
    lineUpsideDown: { transform: [{ rotate: '180deg' }] },
    lineCheck: { width: 16, height: 16, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    lineTick: { fontSize: 11, lineHeight: 14, color: colors.white },
    lineNowText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6 },
    lineFree: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
    lineName: { flexShrink: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
    lineTodoName: { fontFamily: fonts.bodyBold },
    lineDone: { textDecorationLine: 'line-through' },
    lineMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
    lineStep: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 30, borderTopWidth: 0.5, borderTopColor: alpha(colors.text, 0.15) },
    lineStepText: { flexShrink: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },
    lineKey: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 8 },
    lineKeyItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    lineKeyDot: { width: 9, height: 9, borderRadius: 3 },
    lineKeyText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
    dropLine: { position: 'absolute', top: 0, left: 8, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
    dropLineText: { width: 'auto', fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
    dropLineRule: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.text },
    anchorEmoji: { fontSize: 12 },
    anchorLabel: { flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.textMuted },
    anchorCount: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint },
    anchorWord: { fontFamily: fonts.bodyBold, fontSize: 16, letterSpacing: 0, textTransform: 'none' },
    anchorDot: { width: 10, height: 10, borderRadius: 5 },
    stacked: { gap: 6, marginTop: 6, marginLeft: 1, paddingLeft: 10, borderLeftWidth: 2 },
    dropSlot: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 6,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: alpha(colors.text, 0.4),
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
    now: { position: 'absolute', left: -6, right: 0, marginTop: -10, flexDirection: 'row', alignItems: 'center', zIndex: 5 },
    eventNext: { borderWidth: 2, borderColor: INK, borderRadius: 14 },
    eventNextLine: { fontFamily: fonts.bodyMedium, fontSize: 12, color: INK },
    nowPill: { width: GUTTER - 8, marginRight: 4, paddingVertical: 3, borderRadius: 10, alignItems: 'center' },
    nowText: { fontFamily: fonts.bodyBold, fontSize: 11 },
    nowRule: { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: 1 },
    fold: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      marginLeft: GUTTER - 6,
      marginVertical: 4,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.raised,
      borderWidth: 1,
      borderColor: colors.raised,
    },
    foldOpen: { backgroundColor: 'transparent', borderColor: colors.cardEdge },
    foldText: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
    foldAction: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
    event: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: loud(EVENT_BLUE),
      overflow: 'hidden',
    },
    eventTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: INK },
    spanHour: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: HOUR_H,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: 'transparent',
      borderRadius: 16,
    },
    spanRule: { flex: 1, height: 1, marginTop: 13, backgroundColor: colors.hairline },
    lanes: { position: 'absolute', top: 0, bottom: 0, left: GUTTER - 6, right: 0 },
    lane: { position: 'absolute', paddingHorizontal: 2 },
    block: {
      gap: 2,
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderLeftWidth: 3,
      overflow: 'hidden',
      alignItems: 'flex-start',
    },
    toast: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text, textAlign: 'center' },
  }) as const;
