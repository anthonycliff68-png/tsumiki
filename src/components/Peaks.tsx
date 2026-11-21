// ponytail: look-only preview of duets/adhd-planner/my-day-round-2.html, take 4
// (bright and sized), with each item keeping its own colour made loud by loud().
// A made-up day that saves nothing. The real one reads the day and writes through
// placeTodo/placeHabit, and the focused block isn't draggable yet.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';

import { Lift, type Drag } from '@/components/Lift';
import { loud } from '@/lib/dayLook';
import { alpha, display, fonts, habitColors } from '@/theme';

type Kind = 'anchor' | 'habit' | 'todo' | 'calendar';
type Item = { id: string; title: string; kind: Kind; start: number; minutes: number | null; color: string; steps?: string[] };

const INK = '#F6F3EC';
const SOFT = 'rgba(246,243,236,0.75)';
const FAINT = 'rgba(246,243,236,0.45)';
const DEEP = '#140D0C';
const DARK = '#1F140F';
const KIND_LABEL: Record<Kind, string> = { todo: 'To-do', habit: 'Habit', anchor: 'Anchor', calendar: 'Calendar' };
const NOW = 11 * 60 + 42;
const PER_MIN = 1.6;
const MIN_H = 44;
const FOCUS = { id: 'tax', title: 'Finish tax form', start: 660, plan: 90, left: 52, step: "Step 2 of 3: find last year's form", color: '#E8552B' };
// Each item's own stored colour, as the app keeps them today.
const DAY: Item[] = [
  { id: 'walk', title: 'Walk', kind: 'habit', start: 450, minutes: 20, color: '#1F8A8C' },
  { id: 'breakfast', title: 'Breakfast', kind: 'anchor', start: 480, minutes: null, color: '#E0A526' },
  { id: 'lunch', title: 'Lunch', kind: 'anchor', start: 750, minutes: null, color: '#C2306B' },
  { id: 'pack', title: 'Pack gym bag', kind: 'todo', start: 870, minutes: 20, color: '#8A5A9E', steps: ['Gym clothes', 'Water bottle', 'Headphones'] },
  { id: 'vet', title: 'Vet', kind: 'calendar', start: 900, minutes: 60, color: '#4A7FD4' },
  { id: 'stretch', title: 'Stretch', kind: 'habit', start: 1005, minutes: 10, color: '#3F8F4F' },
  { id: 'read', title: 'Read 10 pages', kind: 'habit', start: 1260, minutes: 15, color: '#3F5FA8' },
];
const PICKER = habitColors.slice(0, 18);

const clock = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')}`;
const length = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`);
const pct = (v: Animated.Value) => v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

/** Three dots on every item: tap the item to edit it. */
function Dots({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, marginLeft: 10, paddingVertical: 6 }}>
      {[0, 1, 2].map((i) => <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />)}
    </View>
  );
}

export function Peaks({ onCarry }: { onCarry: (id: string | null) => void }) {
  const [done, setDone] = useState<string[]>(['walk']);
  const [moved, setMoved] = useState<Record<string, number>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [ticks, setTicks] = useState<Record<string, number[]>>({ pack: [0] });
  const [editing, setEditing] = useState<Item | null>(null);
  const [carried, setCarried] = useState<string | null>(null);
  const [spot, setSpot] = useState<number | null>(null);
  const [focus, setFocus] = useState<'off' | 'on' | 'paused'>('off');
  const [left, setLeft] = useState(FOCUS.left);
  const [level] = useState(() => new Animated.Value(1));
  const [rows] = useState(() => new Map<string, View>());
  const mids = useRef<{ start: number; mid: number }[]>([]);

  useEffect(() => {
    const sub = level.addListener(({ value }) => setLeft(Math.max(0, Math.ceil(value * FOCUS.plan))));
    return () => level.removeListener(sub);
  }, [level]);

  const toggle = (id: string) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const colorOf = (it: { id: string; color: string }) => loud(colors[it.id] ?? it.color);

  // Water starts full and drains top to bottom as the time runs out.
  const drain = () => {
    level.stopAnimation((v) => Animated.timing(level, { toValue: 0, duration: v * FOCUS.plan * 60000, easing: Easing.linear, useNativeDriver: false }).start());
  };
  const startFocus = () => {
    setFocus('on');
    level.setValue(1);
    Animated.timing(level, { toValue: FOCUS.left / FOCUS.plan, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => finished && drain());
  };
  const pause = () => {
    if (focus === 'on') {
      level.stopAnimation();
      setFocus('paused');
    } else {
      setFocus('on');
      drain();
    }
  };
  const addFive = () => level.stopAnimation((v) => {
    level.setValue(Math.min(1, v + 5 / FOCUS.plan));
    if (focus === 'on') drain();
  });
  const finishFocus = () => {
    level.stopAnimation();
    setFocus('off');
    toggle(FOCUS.id);
  };

  const items = DAY.map((it) => ({ ...it, start: moved[it.id] ?? it.start })).sort((a, b) => a.start - b.start);
  const focusItem: Item = { id: FOCUS.id, title: FOCUS.title, kind: 'todo', start: FOCUS.start, minutes: FOCUS.plan, color: FOCUS.color, steps: ['Gather the receipts', "Find last year's form", 'Fill it in and send'] };

  const dragOf = (it: Item): Drag => ({
    onPickUp: () => {
      setCarried(it.id);
      onCarry(it.id);
      mids.current = [];
      rows.forEach((node, id) => {
        if (id === it.id || id.startsWith('free')) return;
        const start = id === FOCUS.id ? FOCUS.start : (items.find((x) => x.id === id)?.start ?? 0);
        node.measureInWindow((_x, y, _w, h) => mids.current.push({ start, mid: y + h / 2 }));
      });
    },
    onHover: (y) => {
      const list = [...mids.current].sort((a, b) => a.start - b.start);
      if (!list.length) return;
      const i = list.findIndex((r) => r.mid > y);
      const prev = i === 0 ? list[0]!.start - 60 : (list[i === -1 ? list.length - 1 : i - 1]!.start);
      const next = i === -1 ? list[list.length - 1]!.start + 60 : list[i]!.start;
      setSpot(Math.round((prev + next) / 2 / 15) * 15);
    },
    onDrop: () => {
      if (spot !== null) setMoved((m) => ({ ...m, [it.id]: spot }));
    },
    onRelease: () => {
      onCarry(null);
      setCarried(null);
      setSpot(null);
    },
  });

  // The circle on the rail is the check-off; the block itself opens the edit sheet.
  const node = (it: Item) => {
    const c = colorOf(it);
    if (it.kind === 'anchor') return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c, opacity: it.start < NOW ? 0.6 : 1 }} />;
    if (it.kind === 'calendar') return <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: c }} />;
    const isDone = done.includes(it.id);
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isDone }}
        accessibilityLabel={`Done: ${it.title}`}
        hitSlop={12}
        onPress={() => toggle(it.id)}
        style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, borderColor: c, backgroundColor: isDone ? c : DEEP, alignItems: 'center', justifyContent: 'center' }}
      >
        {isDone && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 14, color: DARK }}>✓</Text>}
      </Pressable>
    );
  };

  /** Time | rail (line + node) | body. The node sits level with the first line of the body. */
  const row = (id: string, it: Item | null, body: ReactNode, top = 14) => {
    const past = it ? it.start < NOW : false;
    const timeText = it && carried === it.id && spot !== null ? clock(spot) : it ? clock(it.start) : '';
    return (
      <View
        key={id}
        ref={(r) => {
          if (r) rows.set(id, r);
          else rows.delete(id);
        }}
        collapsable={false}
        style={{ flexDirection: 'row', marginBottom: 8, zIndex: carried === id ? 5 : 0 }}
      >
        <View style={{ width: 40, paddingTop: top, alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: carried === id || it?.id === FOCUS.id ? fonts.bodyBold : fonts.body, fontSize: 12, color: carried === id ? INK : past ? FAINT : SOFT }}>{timeText}</Text>
        </View>
        <View style={{ width: 32, alignItems: 'center' }}>
          <View style={{ position: 'absolute', top: 0, bottom: -8, width: 3, backgroundColor: past ? 'rgba(246,243,236,0.75)' : 'rgba(246,243,236,0.25)' }} />
          {it && <View style={{ marginTop: top - 4 }}>{node(it)}</View>}
        </View>
        <View style={{ flex: 1 }}>{body}</View>
      </View>
    );
  };

  const anchor = (it: Item) => {
    const c = colorOf(it);
    return (
      <Lift onTap={() => setEditing(it)} drag={dragOf(it)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, opacity: it.start < NOW ? 0.6 : 1 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: c }}>{it.title}</Text>
          <Dots color={c} />
        </View>
      </Lift>
    );
  };

  const block = (it: Item) => {
    const c = colorOf(it);
    const isDone = done.includes(it.id);
    const h = Math.max(MIN_H, Math.round((it.minutes ?? 0) * PER_MIN));
    const thin = h < 56;
    const sub = it.steps ? `${(ticks[it.id] ?? []).length} of ${it.steps.length} steps` : it.kind === 'calendar' ? `Calendar, ${length(it.minutes ?? 0)}` : `${KIND_LABEL[it.kind]}, ${it.minutes} min`;
    const face = (
      <View
        style={{
          height: h,
          borderRadius: 13,
          backgroundColor: c,
          opacity: isDone ? 0.5 : 1,
          paddingLeft: 14,
          paddingRight: 12,
          paddingTop: thin ? 0 : 10,
          justifyContent: thin ? 'center' : 'flex-start',
          shadowColor: c,
          shadowOpacity: carried === it.id ? 0.7 : 0.45,
          shadowRadius: carried === it.id ? 18 : 11,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15.5, color: DARK, textDecorationLine: isDone ? 'line-through' : 'none' }}>{it.title}</Text>
          {thin && <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.body, fontSize: 12, color: alpha(DARK, 0.7), marginLeft: 8 }}>{sub}</Text>}
          {!thin && <View style={{ flex: 1 }} />}
          {it.kind === 'calendar' ? <Text style={{ fontSize: 11, marginLeft: 10 }}>🔒</Text> : <Dots color={DARK} />}
        </View>
        {!thin && <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: alpha(DARK, 0.7), marginTop: 1 }}>{sub}</Text>}
      </View>
    );
    if (it.kind === 'calendar') return face;
    return <Lift onTap={() => setEditing(it)} drag={dragOf(it)}>{face}</Lift>;
  };

  const free = (key: string, minutes: number) => (
    <View key={key} style={{ flexDirection: 'row', marginBottom: 8 }}>
      <View style={{ width: 40 }} />
      <View style={{ width: 32, alignItems: 'center' }}>
        <View style={{ position: 'absolute', top: -8, bottom: -8, width: 3, backgroundColor: 'rgba(246,243,236,0.25)' }} />
      </View>
      <View style={{ flex: 1, height: 28, borderRadius: 9, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(246,243,236,0.22)', justifyContent: 'center', paddingLeft: 11 }}>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color: FAINT }}>{length(minutes)} free</Text>
      </View>
    </View>
  );

  const button = (label: string, onPress: () => void, strong = false, ink = DARK) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ backgroundColor: strong ? '#FBF8F2' : 'rgba(255,255,255,0.3)', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8 }}>
      <Text style={{ fontFamily: strong ? fonts.bodyBold : fonts.bodyMedium, fontSize: 13.5, color: strong ? '#8A2E12' : ink }}>{label}</Text>
    </Pressable>
  );

  const current = () => {
    if (done.includes(FOCUS.id)) return row(FOCUS.id, focusItem, block(focusItem));
    const on = focus !== 'off';
    const c = colorOf(focusItem);
    const ink = on ? INK : DARK;
    return row(
      FOCUS.id,
      focusItem,
      <View style={{ borderRadius: 13, overflow: 'hidden', backgroundColor: on ? 'rgba(20,13,12,0.85)' : c, borderWidth: on ? 2 : 0, borderColor: c, shadowColor: c, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }}>
        {on && <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: pct(level), backgroundColor: alpha(c, 0.9) }} />}
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${FOCUS.title}`} onPress={() => setEditing(focusItem)} style={{ padding: 14, paddingLeft: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontFamily: fonts.bodyBold, fontSize: 20, color: on ? INK : DARK }}>{FOCUS.title}</Text>
            <Dots color={on ? INK : DARK} />
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 13.5, color: on ? INK : DARK, marginTop: 3 }}>{FOCUS.step}</Text>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 28, letterSpacing: -0.5, color: on ? INK : DARK, marginTop: 4 }}>
            {focus === 'paused' ? `Paused, ${left} min left` : `${left} min left`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {on ? (
              <>
                {button(focus === 'paused' ? 'Resume' : 'Pause', pause, false, ink)}
                {button('+5', addFive, false, ink)}
                {button('Done', finishFocus, true)}
              </>
            ) : (
              <>
                {button('Start focus', startFocus, true)}
                {button('Done', finishFocus)}
              </>
            )}
          </View>
        </Pressable>
      </View>,
      16,
    );
  };

  // The day in order, the focus block in its place, free time wherever a gap is 30 minutes or more.
  const all: Item[] = [...items, focusItem].sort((a, b) => a.start - b.start);
  const list: ReactNode[] = [];
  let prevEnd: number | null = null;
  for (const it of all) {
    if (prevEnd !== null && it.start - prevEnd >= 30 && carried === null) list.push(free(`free${it.id}`, it.start - prevEnd));
    if (it.id === FOCUS.id) list.push(current());
    else list.push(row(it.id, it, it.kind === 'anchor' ? anchor(it) : block(it), it.kind === 'anchor' ? 13 : Math.max(MIN_H, (it.minutes ?? 0) * PER_MIN) < 56 ? 15 : 14));
    prevEnd = it.start + (it.minutes ?? 30);
  }

  return (
    <View>
      <View>{list}</View>
      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        {editing && (
          <Sheet
            item={editing}
            color={colors[editing.id] ?? editing.color}
            ticks={ticks[editing.id] ?? []}
            onTick={(n) => setTicks((t) => {
              const had = t[editing.id] ?? [];
              return { ...t, [editing.id]: had.includes(n) ? had.filter((i) => i !== n) : [...had, n] };
            })}
            onColor={(c) => setColors((m) => ({ ...m, [editing.id]: c }))}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </View>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.3, color: FAINT, marginTop: 16, marginBottom: 8 }}>{children}</Text>;
}

function Sheet({ item, color, ticks, onTick, onColor, onClose }: { item: Item; color: string; ticks: number[]; onTick: (n: number) => void; onColor: (c: string) => void; onClose: () => void }) {
  const c = loud(color);
  const chip = (label: string, on: boolean) => (
    <View key={label} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: on ? c : 'rgba(255,255,255,0.08)' }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: on ? DARK : SOFT }}>{label}</Text>
    </View>
  );
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6,5,5,0.6)' }}>
      <View style={{ backgroundColor: '#1E1715', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 12, paddingBottom: 42 }}>
        <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', alignSelf: 'center', marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9, backgroundColor: alpha(c, 0.18) }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, color: c }}>{KIND_LABEL[item.kind].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" onPress={onClose} style={{ backgroundColor: c, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 7 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: DARK }}>Done</Text>
          </Pressable>
        </View>
        <Text numberOfLines={1} style={{ ...display(30, 34), color: INK, marginTop: 14, paddingBottom: 8, borderBottomWidth: 1.5, borderBottomColor: alpha(c, 0.5) }}>{item.title}</Text>
        <Label>COLOUR</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          {PICKER.map((d) => (
            <Pressable key={d} accessibilityRole="button" accessibilityLabel={`Colour ${d}`} onPress={() => onColor(d)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: loud(d), borderWidth: d === color ? 3 : 0, borderColor: INK }} />
          ))}
        </View>
        <Label>WHAT TIME</Label>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {item.kind === 'anchor' ? [chip(`At ${clock(item.start)}`, true), chip('Pick a time', false)] : [chip('Anytime', false), chip(`At ${clock(item.start)}`, true), chip('After an anchor', false)]}
        </View>
        {item.minutes !== null && (
          <>
            <Label>HOW LONG</Label>
            <View style={{ flexDirection: 'row', gap: 6 }}>{[chip(length(item.minutes), true), chip('Custom', false)]}</View>
          </>
        )}
        {item.steps && (
          <>
            <Label>STEPS</Label>
            {item.steps.map((s, n) => {
              const on = ticks.includes(n);
              return (
                <Pressable key={s} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => onTick(n)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: c, backgroundColor: on ? c : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <Text style={{ fontSize: 11, lineHeight: 13, color: DARK }}>✓</Text>}
                  </View>
                  <Text style={{ fontFamily: fonts.body, fontSize: 14.5, color: on ? FAINT : INK, textDecorationLine: on ? 'line-through' : 'none' }}>{s}</Text>
                </Pressable>
              );
            })}
          </>
        )}
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: FAINT, marginTop: 18 }}>Delete {KIND_LABEL[item.kind].toLowerCase()}</Text>
      </View>
    </View>
  );
}
