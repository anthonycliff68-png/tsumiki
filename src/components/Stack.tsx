// ponytail: look-only preview of the stack + rail in duets/adhd-planner/mockups.html.
// A made-up day that saves nothing. The Next block's hold isn't wired; the real
// one reads the day and writes through placeTodo/placeHabit.
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { Lift, type Drag } from '@/components/Lift';
import { formatLength, lengthScale, minuteAt } from '@/lib/timeline';
import { display, fonts } from '@/theme';

type Kind = 'anchor' | 'habit' | 'todo' | 'calendar';
type Item = { id: string; title: string; kind: Kind; start: number; minutes: number | null; steps?: string[] };

const INK = '#F4F1EC';
const SOFT = '#BDB7AD';
const PAPER = '#EFE8DA';
const DARK = '#17151A';
const STILL = '#2A272F';
const WATER = '#2C98BC';
const LOOK: Record<Kind, { bg: string; lip: string; radius: object }> = {
  todo: { bg: '#5B4FD1', lip: '#3D3590', radius: { borderRadius: 6 } },
  habit: { bg: '#12805E', lip: '#0B5B43', radius: { borderRadius: 99 } },
  calendar: { bg: '#2F62B8', lip: '#204482', radius: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 } },
  anchor: { bg: PAPER, lip: PAPER, radius: { borderRadius: 3 } },
};
const DAY: Item[] = [
  { id: 'lunch', title: 'Lunch', kind: 'anchor', start: 750, minutes: null },
  { id: 'tidy', title: 'Tidy desk', kind: 'habit', start: 780, minutes: 25 },
  { id: 'pack', title: 'Pack gym bag', kind: 'todo', start: 870, minutes: 20, steps: ['Pack shoes', 'Fill water bottle', 'Find towel'] },
  { id: 'vet', title: 'Vet', kind: 'calendar', start: 900, minutes: 60 },
  { id: 'parcel', title: 'Parcel', kind: 'todo', start: 930, minutes: 15 },
  { id: 'stretch', title: 'Stretch', kind: 'habit', start: 970, minutes: 10 },
];
const NEXT = { title: 'Finish tax form', left: '48 min left', steps: ['Gather the receipts', "Find last year's form", 'Fill it in and send'], done: 1 };
const FIRST_HOUR = 12;
const LAST_HOUR = 21;
const TOWER = ['#12805E', '#5B4FD1', '#2F62B8', '#12805E', '#2C98BC'];
const DOTS_W = 40;

const clock = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')}`;
const at = (m: number) => `${clock(m)} ${m < 720 ? 'AM' : 'PM'}`;
const hourName = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
const size = (m: number | null) => (m === null ? 34 : Math.round(46 * lengthScale(m)));
const length = (m: number) => (m < 60 ? `${m} min` : formatLength(m));

function Dots({ color }: { color: string }) {
  return <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 16, color, width: DOTS_W - 10, textAlign: 'right' }}>...</Text>;
}

export function Stack({ onStart, onCarry }: { onStart: () => void; onCarry: (id: string | null) => void }) {
  const [moved, setMoved] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState<string[]>([]);
  const [open, setOpen] = useState('');
  const [ticks, setTicks] = useState<Record<string, number[]>>({ pack: [0] });
  const [carried, setCarried] = useState<string | null>(null);
  const [spot, setSpot] = useState<number | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const rows = useRef(new Map<number, View>());
  const rects = useRef<{ hour: number; top: number; bottom: number }[]>([]);
  const widths = useRef<Record<string, number>>({});

  const items = DAY.filter((it) => !finished.includes(it.id))
    .map((it) => ({ ...it, start: moved[it.id] ?? it.start }))
    .sort((a, b) => a.start - b.start);
  const inHour = (h: number) => items.filter((it) => Math.floor(it.start / 60) === h);

  // Measured once the lift has rendered, so the hours it unfolds count too.
  useEffect(() => {
    if (!carried) return;
    rects.current = [];
    rows.current.forEach((node, hour) => node.measureInWindow((_x, y, _w, h) => rects.current.push({ hour, top: y, bottom: y + h })));
  }, [carried]);

  const dragOf = (it: Item): Drag => ({
    onPickUp: () => {
      setOpen('');
      setCarried(it.id);
      onCarry(it.id);
    },
    onHover: (y) => {
      const r = rects.current.find((x) => y >= x.top && y < x.bottom);
      setSpot(r ? minuteAt(r.hour * 60, (r.hour + 1) * 60, (y - r.top) / (r.bottom - r.top)) : null);
    },
    onDrop: () => {
      if (spot !== null) setMoved((m) => ({ ...m, [it.id]: spot }));
    },
    onRelease: () => {
      setCarried(null);
      setSpot(null);
      onCarry(null);
    },
  });

  const tapped = (it: Item, x: number) => {
    if (it.kind !== 'anchor' && x > (widths.current[it.id] ?? 999) - DOTS_W) return setEditing(it);
    if (it.steps) return setOpen((o) => (o === it.id ? '' : it.id));
    if (it.kind === 'habit' || it.kind === 'todo') setFinished((f) => [...f, it.id]);
  };
  const flip = (it: Item, n: number) => {
    const had = ticks[it.id] ?? [];
    const next = had.includes(n) ? had.filter((i) => i !== n) : [...had, n];
    setTicks((t) => ({ ...t, [it.id]: next }));
    if (next.length === it.steps?.length) {
      setFinished((f) => [...f, it.id]);
      setOpen('');
    }
  };

  const face = (it: Item, narrow: boolean) => {
    const fg = it.kind === 'anchor' ? DARK : INK;
    const inlineTime = it.start % 60 && !it.steps && it.minutes !== null ? `${clock(it.start)}, ` : '';
    const sub = narrow ? clock(it.start) : it.steps ? `${(ticks[it.id] ?? []).length} of ${it.steps.length}` : it.minutes === null ? clock(it.start) : `${inlineTime}${length(it.minutes)}`;
    return (
      <View onLayout={(e) => (widths.current[it.id] = e.nativeEvent.layout.width)} style={{ flexDirection: 'row', alignItems: 'center', minHeight: size(it.minutes) - 4, paddingLeft: 12, paddingRight: it.kind === 'anchor' ? 12 : 4 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: fg }}>{it.title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, color: fg, marginLeft: 8 }}>{sub}</Text>
        {it.kind === 'calendar' ? <Text style={{ fontSize: 11, marginHorizontal: 8 }}>🔒</Text> : it.kind !== 'anchor' && <Dots color={fg} />}
        {carried === it.id && spot !== null && (
          <View style={{ position: 'absolute', right: 0, top: -30, backgroundColor: PAPER, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: DARK }}>{at(spot)}</Text>
          </View>
        )}
      </View>
    );
  };

  const block = (it: Item, narrow: boolean) => {
    const look = LOOK[it.kind];
    const box = { backgroundColor: look.bg, borderBottomWidth: it.kind === 'anchor' ? 0 : 4, borderBottomColor: look.lip, ...look.radius, ...(it.kind === 'anchor' ? { transform: [{ rotate: '-0.7deg' }] } : {}) };
    if (it.kind === 'calendar') return <View style={box}>{face(it, narrow)}</View>;
    const lift = (body: React.ReactNode) => <Lift onTap={(x) => tapped(it, x)} drag={dragOf(it)}>{body}</Lift>;
    if (open !== it.id || !it.steps) return lift(<View style={box}>{face(it, narrow)}</View>);
    return (
      <View style={[box, { paddingBottom: 6 }]}>
        {lift(face(it, narrow))}
        {it.steps.map((s, n) => {
          const done = (ticks[it.id] ?? []).includes(n);
          return (
            <Pressable key={s} accessibilityRole="checkbox" accessibilityState={{ checked: done }} onPress={() => flip(it, n)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 8 }}>
              <View style={{ width: 19, height: 19, borderRadius: 5, borderWidth: 1.5, borderColor: INK, backgroundColor: done ? INK : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {done && <Text style={{ fontSize: 12, lineHeight: 14, color: look.lip }}>✓</Text>}
              </View>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: INK, textDecorationLine: done ? 'line-through' : 'none' }}>{s}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const hourRow = (h: number) => {
    const here = inHour(h);
    // ponytail: only compares neighbours inside one hour. Real one uses laySpans.
    const clash = here.some((it, i) => i > 0 && it.start < here[i - 1]!.start + (here[i - 1]!.minutes ?? 0));
    const lineTop = spot !== null && Math.floor(spot / 60) === h ? `${((spot % 60) / 60) * 100}%` : null;
    return (
      <View key={h} ref={(n) => { if (n) rows.current.set(h, n); else rows.current.delete(h); }} collapsable={false} style={{ flexDirection: 'row', marginBottom: 7, zIndex: here.some((it) => it.id === carried) ? 10 : 0 }}>
        <Text style={{ width: 46, paddingTop: 8, fontFamily: fonts.body, fontSize: 12, color: SOFT }}>{hourName(h)}</Text>
        <View style={{ flex: 1, minHeight: here.length ? undefined : 44, flexDirection: clash ? 'row' : 'column', gap: 6, backgroundColor: !here.length && carried ? STILL : 'transparent', borderRadius: 6 }}>
          {here.map((it, i) => (
            <View key={it.id} style={clash ? { flex: 1, alignSelf: i > 0 ? 'flex-end' : 'flex-start' } : undefined}>
              {carried === it.id && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#6F6A75', borderRadius: 6 }} />}
              {block(it, clash)}
            </View>
          ))}
          {lineTop !== null && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: lineTop as `${number}%`, height: 2, backgroundColor: PAPER }} />}
        </View>
      </View>
    );
  };

  const rail: React.ReactNode[] = [];
  for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
    if (carried || inHour(h).length) {
      rail.push(hourRow(h));
      continue;
    }
    const from = h;
    while (h < LAST_HOUR && !inHour(h + 1).length) h++;
    rail.push(
      <View key={from} style={{ flexDirection: 'row', marginBottom: 7 }}>
        <View style={{ width: 46 }} />
        <View style={{ backgroundColor: STILL, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: SOFT }}>{from === h ? `${hourName(from)}, empty` : `${hourName(from)} to ${hourName(h)}, empty`}</Text>
        </View>
      </View>,
    );
  }

  return (
    <View style={{ paddingTop: 4 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 15, color: INK, marginBottom: 10 }}>One big thing, then lunch. Free after 4:20.</Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: 6 }}>
        {[...TOWER, ...finished.map(() => '#5B4FD1')].map((c, i) => (
          <View key={i} style={{ flex: 1, height: 10 + ((i * 7) % 12), backgroundColor: c, borderRadius: 2 }} />
        ))}
      </View>

      <View style={{ height: 264, backgroundColor: LOOK.todo.bg, borderBottomWidth: 7, borderBottomColor: LOOK.todo.lip, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, padding: 14, overflow: 'hidden', marginBottom: 12 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '20%', backgroundColor: WATER, borderTopLeftRadius: 120, borderTopRightRadius: 170 }} />
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: INK }}>{NEXT.left}</Text>
        <Text numberOfLines={2} adjustsFontSizeToFit style={{ ...display(50, 52), color: INK, marginTop: 2 }}>{NEXT.title}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: INK, marginTop: 8 }}>Step {NEXT.done + 1} of {NEXT.steps.length}</Text>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 17, color: INK, marginTop: 1 }}>{NEXT.steps[NEXT.done]}</Text>
        <View style={{ flexDirection: 'row', gap: 5, marginTop: 8 }}>
          {NEXT.steps.map((s, i) => <View key={s} style={{ width: 22, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: INK, backgroundColor: i < NEXT.done ? INK : 'transparent' }} />)}
        </View>
        <Pressable accessibilityRole="button" onPress={onStart} style={{ position: 'absolute', right: 12, bottom: 12, backgroundColor: INK, borderRadius: 99, paddingHorizontal: 22, paddingVertical: 9 }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: DARK }}>Start</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${NEXT.title}`} hitSlop={10} onPress={() => setEditing({ id: 'next', title: NEXT.title, kind: 'todo', start: 660, minutes: 60, steps: NEXT.steps })} style={{ position: 'absolute', right: 10, top: 10 }}>
          <Dots color={INK} />
        </Pressable>
      </View>

      {rail}
      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: SOFT, marginTop: 6 }}>Still open: Push-ups, Vitamins</Text>

      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        {editing && <Sheet item={editing} ticked={editing.id === 'next' ? [0] : (ticks[editing.id] ?? [])} onClose={() => setEditing(null)} />}
      </Modal>
    </View>
  );
}

function Sheet({ item, ticked, onClose }: { item: Item; ticked: number[]; onClose: () => void }) {
  const Label = ({ children }: { children: string }) => <Text style={{ fontFamily: fonts.body, fontSize: 12, color: SOFT, marginTop: 14, marginBottom: 5 }}>{children}</Text>;
  const field = { backgroundColor: STILL, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 };
  const text = { fontFamily: fonts.body, fontSize: 15, color: INK };
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,9,12,0.55)' }}>
      <View style={{ backgroundColor: '#1B191F', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text numberOfLines={1} style={{ ...display(30, 34), color: INK, flex: 1 }}>{item.title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={onClose}><Text style={{ fontSize: 18, color: INK }}>✕</Text></Pressable>
        </View>
        <Label>Colour</Label>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {['#5B4FD1', '#12805E', '#2F62B8', '#D9502B', '#2C98BC'].map((c) => (
            <View key={c} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: c === LOOK[item.kind].bg ? 2 : 0, borderColor: INK }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Label>When</Label><View style={field}><Text style={text}>{at(item.start)}</Text></View></View>
          <View style={{ flex: 1 }}><Label>How long</Label><View style={field}><Text style={text}>{length(item.minutes ?? 15)}</Text></View></View>
        </View>
        {item.steps && (
          <>
            <Label>Steps</Label>
            {item.steps.map((s, n) => (
              <View key={s} style={[field, { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 5 }]}>
                <View style={{ width: 17, height: 17, borderRadius: 4, borderWidth: 1.5, borderColor: INK, backgroundColor: ticked.includes(n) ? INK : 'transparent' }} />
                <Text style={[text, { flex: 1, textDecorationLine: ticked.includes(n) ? 'line-through' : 'none' }]}>{s}</Text>
                <Text style={{ color: SOFT, fontSize: 15 }}>≡</Text>
              </View>
            ))}
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: SOFT, paddingVertical: 5 }}>+ Add a step</Text>
          </>
        )}
        <Label>Note</Label>
        <View style={field}><Text style={[text, { color: SOFT }]}>Add a note</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 15, color: '#E8836A' }}>Delete</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ backgroundColor: INK, borderRadius: 99, paddingHorizontal: 26, paddingVertical: 10 }}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: DARK }}>Save</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
