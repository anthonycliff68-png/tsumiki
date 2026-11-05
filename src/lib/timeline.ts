/**
 * Where things with a length sit on My Day. Nothing with a length, nothing
 * changes: those hours stay ordinary rows. An hour touched by something with a
 * length joins a span, drawn to scale, with whatever overlaps side by side.
 * Pure, so it is tested; nothing here may import from '@/'.
 */

export type Slot = { id: string; start: number; minutes: number | null };
/** `lanes`: how many share the width here. What overlaps nothing gets all of it. */
export type Placed = { id: string; start: number; end: number; lane: number; lanes: number };
export type Span = { from: number; to: number; end: number; items: Placed[] };

/** A card needs this much room to be read, however short the thing is. */
const SHORTEST = 30;
/** More than this and a phone has no width left for the words. */
const MOST_LANES = 3;
const DAY = 24 * 60;

const endOf = (s: Slot) => Math.min(s.start + Math.max(s.minutes ?? 0, SHORTEST), DAY);

export function laySpans(slots: Slot[]): Span[] {
  const ranges = slots
    .filter((s) => s.minutes)
    .map((s) => ({ from: Math.floor(s.start / 60), to: Math.ceil(endOf(s) / 60) }))
    .sort((a, b) => a.from - b.from);

  const merged: { from: number; to: number }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.from < last.to) last.to = Math.max(last.to, r.to);
    else merged.push({ ...r });
  }

  return merged.map(({ from, to }) => {
    const inside = slots
      .filter((s) => s.start >= from * 60 && s.start < to * 60)
      .sort((a, b) => a.start - b.start || endOf(b) - endOf(a));
    const items: Placed[] = [];
    let laneEnds: number[] = [];
    let overlapping: Placed[] = [];
    const settle = () => {
      for (const p of overlapping) p.lanes = laneEnds.length;
      overlapping = [];
      laneEnds = [];
    };
    for (const s of inside) {
      if (laneEnds.length > 0 && s.start >= Math.max(...laneEnds)) settle();
      const end = endOf(s);
      let lane = laneEnds.findIndex((e) => e <= s.start);
      if (lane < 0 && laneEnds.length < MOST_LANES) lane = laneEnds.length;
      // ponytail: a fourth overlap draws over the lane that frees up first. Rare enough to leave.
      if (lane < 0) lane = laneEnds.indexOf(Math.min(...laneEnds));
      laneEnds[lane] = end;
      const placed = { id: s.id, start: s.start, end, lane, lanes: 1 };
      overlapping.push(placed);
      items.push(placed);
    }
    settle();
    return { from, to, end: Math.max(to * 60, ...items.map((i) => i.end)), items };
  });
}

/** "15m", "1h", "1h 30m". */
export function formatLength(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ');
}
