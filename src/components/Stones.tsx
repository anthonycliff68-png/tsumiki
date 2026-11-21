// ponytail: preview of concept 3 in duets/adhd-planner/concepts.html. Taps only
// open Focus: finishing and hold-to-move aren't wired. Real one needs both.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import { fonts, display } from '@/theme';
import { formatLength, lengthScale } from '@/lib/timeline';

export type StoneItem = {
  id: string;
  title: string;
  emoji: string;
  kind: 'anchor' | 'habit' | 'todo' | 'calendar';
  start: number;
  minutes: number | null;
  done: boolean;
  missed: boolean;
  isNext: boolean;
  line: string | null;
};

const WATER = '#2C98BC';
const STILL = '#1E3442';
const DONE = '#1B6F8C';
const MISSED = '#8E897F';
const PLANK = '#E9E3D8';
const INK = '#F4F1EC';
const DARK = '#16161A';

type Point = { x: number; y: number };
type Placed = { it: StoneItem; x: number; y: number; w: number; h: number };

/** A lumpy oval, the same one every time for a given seed. */
function blob(w: number, h: number, seed: number): string {
  const wob = (n: number, size: number) => size * ((Math.abs(Math.sin(seed * n * 12.9898) * 43758.5453) % 1) - 0.5);
  const k = 0.56;
  const tx = w / 2 + wob(1, w * 0.22);
  const ry = h / 2 + wob(2, h * 0.22);
  const bx = w / 2 + wob(3, w * 0.22);
  const ly = h / 2 + wob(4, h * 0.22);
  return [
    `M${tx} 0`,
    `C${tx + k * (w - tx)} 0 ${w} ${ry - k * ry} ${w} ${ry}`,
    `C${w} ${ry + k * (h - ry)} ${bx + k * (w - bx)} ${h} ${bx} ${h}`,
    `C${bx - k * bx} ${h} 0 ${ly + k * (h - ly)} 0 ${ly}`,
    `C0 ${ly - k * ly} ${tx - k * tx} 0 ${tx} 0Z`,
  ].join(' ');
}

const stream = (pts: Point[]) =>
  pts.reduce((d, p, i) => {
    const q = pts[i - 1];
    if (!q) return `M${p.x} ${p.y}`;
    const m = (q.y + p.y) / 2;
    return `${d} C${q.x} ${m} ${p.x} ${m} ${p.x} ${p.y}`;
  }, '');

function layOut(items: StoneItem[], W: number) {
  const placed: Placed[] = [];
  const points: Point[] = [{ x: W / 2, y: 0 }];
  let bottoms: [number, number] = [4, 4];
  let side: 0 | 1 = 0;
  let last: Placed | null = null;
  for (const it of items) {
    if (it.kind === 'anchor' || it.isNext) {
      const top: number = Math.max(...bottoms) + 16;
      const big = it.isNext;
      const w = big ? W - 24 : Math.min(W * 0.62, 96 + it.title.length * 10);
      const h = big ? 150 + (lengthScale(it.minutes) - 1) * 50 : 30;
      const x = big ? 12 : (W - w) / 2 + (placed.length % 2 ? 14 : -14);
      placed.push({ it, x, y: top, w, h });
      points.push({ x: x + w / 2, y: top + h / 2 });
      bottoms = [top + h, top + h];
      last = null;
      continue;
    }
    const s = lengthScale(it.minutes);
    const w = Math.min(W * 0.66, Math.max(112 * s, 72 + it.title.length * 6.6));
    const h = 78 * s;
    let top = bottoms[side] + 10;
    if (last) top = Math.max(top, last.y + last.h * 0.55, last.w + w > W - 6 ? last.y + last.h + 10 : 0);
    const stone: Placed = { it, x: side ? W - w : 0, y: top, w, h };
    placed.push(stone);
    points.push({ x: side ? W * 0.36 : W * 0.64, y: top + h / 2 });
    bottoms[side] = top + h;
    last = stone;
    side = side ? 0 : 1;
  }
  const height = Math.max(...bottoms) + 30;
  points.push({ x: W / 2, y: height });
  return { placed, points, height };
}

/** How far down the stream the clock has got. */
function nowY(placed: Placed[], height: number, now: number): number {
  let i = -1;
  placed.forEach((p, n) => {
    if (p.it.start <= now) i = n;
  });
  const a = placed[i];
  if (!a) return 0;
  const b = placed[i + 1];
  const from = a.y + a.h / 2;
  if (!b) return from + (height - from) * Math.min(1, (now - a.it.start) / 120);
  const span = b.it.start - a.it.start;
  return from + ((b.y + b.h / 2 - from) * (span > 0 ? now - a.it.start : 0)) / (span || 1);
}

export function Stones({
  items,
  colors,
  now,
  nowLabel,
  onPress,
  nextRef,
}: {
  items: StoneItem[];
  colors: Record<'habit' | 'todo' | 'calendar', string>;
  now: number | null;
  nowLabel: string;
  onPress: (id: string) => void;
  nextRef?: (node: View | null) => void;
}) {
  const [W, setW] = useState(0);
  const { placed, points, height } = layOut(items, W || 360);
  const yNow = now === null ? 0 : nowY(placed, height, now);
  const path = stream(points);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {W > 0 && (
        <>
          <Svg width={W} height={height} style={{ position: 'absolute' }}>
            <Defs>
              <ClipPath id="gone">
                <Rect width={W} height={yNow} />
              </ClipPath>
            </Defs>
            <Path d={path} stroke={STILL} strokeOpacity={0.9} strokeWidth={28} strokeLinecap="round" fill="none" />
            <Path d={path} stroke={WATER} strokeWidth={28} strokeLinecap="round" fill="none" clipPath="url(#gone)" />
            {placed.map(({ it, x, y, w, h }, i) =>
              it.kind === 'anchor' ? null : (
                <G key={it.id} x={x} y={y}>
                  <Path
                    d={blob(w, h, i + 1)}
                    fill={it.done ? DONE : it.missed ? MISSED : colors[it.kind]}
                    stroke={it.isNext ? INK : 'none'}
                    strokeWidth={3}
                  />
                </G>
              ),
            )}
          </Svg>
          {placed.map(({ it, x, y, w, h }, i) =>
            it.kind === 'anchor' ? (
              <View
                key={it.id}
                style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 5, backgroundColor: PLANK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: i % 2 ? '3deg' : '-3deg' }] }}
              >
                <Text numberOfLines={1} style={{ ...display(17, 20), color: DARK }}>{it.title}</Text>
              </View>
            ) : (
              <Pressable
                key={it.id}
                ref={it.isNext ? nextRef : undefined}
                collapsable={false}
                accessibilityRole="button"
                accessibilityLabel={it.title}
                onPress={() => onPress(it.id)}
                style={{ position: 'absolute', left: x, top: y, width: w, height: h, alignItems: 'center', justifyContent: 'center', paddingHorizontal: it.isNext ? 34 : 14 }}
              >
                {it.isNext ? (
                  <Text numberOfLines={2} adjustsFontSizeToFit style={{ ...display(50, 52), color: INK, textAlign: 'center' }}>
                    {it.title}
                  </Text>
                ) : (
                  <Text numberOfLines={2} style={{ fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 17, textAlign: 'center', color: it.missed && !it.done ? DARK : INK, textDecorationLine: it.done ? 'line-through' : 'none' }}>
                    {it.emoji ? `${it.emoji} ` : ''}
                    {it.title}
                  </Text>
                )}
                {(it.isNext ? it.line : it.minutes) ? (
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, marginTop: 2, color: it.missed && !it.done ? DARK : INK }}>
                    {it.isNext ? it.line : it.minutes! < 60 ? `${it.minutes} min` : formatLength(it.minutes!)}
                  </Text>
                ) : null}
              </Pressable>
            ),
          )}
          {now !== null && (
            <View pointerEvents="none" style={{ position: 'absolute', right: 2, top: yNow - 11, backgroundColor: PLANK, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: DARK }}>{nowLabel}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

/** Focus, for a task with steps: its own small stream. */
export function StepStones({
  steps,
  checked,
  current,
  hint,
  onCheck,
}: {
  steps: string[];
  checked: number[];
  current: number;
  hint: string;
  onCheck: (i: number) => void;
}) {
  const [W, setW] = useState(0);
  const H = 132;
  const height = steps.length * (H + 10);
  const points = [{ x: W / 2, y: 0 }, ...steps.map((_, i) => ({ x: i % 2 ? W * 0.66 : W * 0.34, y: i * (H + 10) + H / 2 })), { x: W / 2, y: height }];
  const path = stream(points);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {W > 0 && (
        <>
          <Svg width={W} height={height} style={{ position: 'absolute' }}>
            <Defs>
              <ClipPath id="stepsGone">
                <Rect width={W} height={(current < 0 ? steps.length : current) * (H + 10) + H / 2} />
              </ClipPath>
            </Defs>
            <Path d={path} stroke={STILL} strokeWidth={24} strokeLinecap="round" fill="none" />
            <Path d={path} stroke={WATER} strokeWidth={24} strokeLinecap="round" fill="none" clipPath="url(#stepsGone)" />
            {steps.map((s, i) => (
              <G key={s} x={i === current ? 0 : W * 0.06} y={i * (H + 10)}>
                <Path
                  d={blob(i === current ? W : W * 0.88, H, i + 2)}
                  fill={checked.includes(i) ? DONE : i === current ? INK : '#27333D'}
                />
              </G>
            ))}
          </Svg>
          {steps.map((s, i) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityLabel={s}
              onPress={() => onCheck(i)}
              style={{ position: 'absolute', left: 0, right: 0, top: i * (H + 10), height: H, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44 }}
            >
              <Text numberOfLines={2} style={{ fontFamily: fonts.bodyMedium, fontSize: i === current ? 24 : 18, textAlign: 'center', color: i === current ? DARK : INK, textDecorationLine: checked.includes(i) ? 'line-through' : 'none' }}>
                {s}
              </Text>
              {i === current && <Text style={{ fontFamily: fonts.body, fontSize: 13, color: DARK, marginTop: 3 }}>{hint}</Text>}
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}
