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
      // Something with no length goes under whatever is above it, full width:
      // a little late on the clock, but the day reads as one column.
      const start = s.minutes || laneEnds.length === 0 ? s.start : Math.max(s.start, ...laneEnds);
      if (laneEnds.length > 0 && start >= Math.max(...laneEnds)) settle();
      let lane = laneEnds.findIndex((e) => e <= start);
      if (lane < 0 && laneEnds.length < MOST_LANES) lane = laneEnds.length;
      // ponytail: a fourth overlap draws over the lane that frees up first. Rare enough to leave.
      if (lane < 0) lane = laneEnds.indexOf(Math.min(...laneEnds));
      const end = endOf({ ...s, start });
      laneEnds[lane] = end;
      const placed = { id: s.id, start, end, lane, lanes: 1 };
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

/**
 * Runs of two or more empty hours in [first, last], to fold into one pill.
 * `to` is exclusive. `keep` (the NOW hour) is never folded away.
 */
export function emptyRuns(
  first: number,
  last: number,
  busy: ReadonlySet<number>,
  keep?: number,
): { from: number; to: number }[] {
  const runs: { from: number; to: number }[] = [];
  let from = -1;
  for (let h = first; h <= last + 1; h++) {
    const empty = h <= last && !busy.has(h) && h !== keep;
    if (empty && from < 0) from = h;
    if (!empty && from >= 0) {
      if (h - from >= 2) runs.push({ from, to: h });
      from = -1;
    }
  }
  return runs;
}

export type LineSlot = { id: string; start: number; minutes: number | null; rank: number };
export type LineRow = { kind: 'item'; id: string; start: number } | { kind: 'free'; minutes: number } | { kind: 'now' };

/**
 * The day as one column in time order. Same minute: lowest rank first, so a
 * moment heads what hangs off it. A long empty stretch becomes a "free" row.
 */
export function lineUp(slots: readonly LineSlot[], now?: number, gap = 60): LineRow[] {
  const rows: LineRow[] = [];
  let end: number | null = null;
  let nowLeft = now !== undefined;
  for (const s of [...slots].sort((a, b) => a.start - b.start || a.rank - b.rank)) {
    if (nowLeft && s.start > (now as number)) {
      rows.push({ kind: 'now' });
      nowLeft = false;
    }
    if (end !== null && s.start - end >= gap) rows.push({ kind: 'free', minutes: s.start - end });
    rows.push({ kind: 'item', id: s.id, start: s.start });
    end = Math.max(end ?? 0, s.start + (s.minutes ?? 0));
  }
  if (nowLeft) rows.push({ kind: 'now' });
  return rows;
}

/** The stretch of the day each row of the line stands for: where a drop on it lands. */
export function lineSpans(rows: readonly LineRow[], now = 0): { from: number; to: number }[] {
  const starts = rows.map((r, i) => {
    if (r.kind === 'item') return r.start;
    if (r.kind === 'now') return now;
    const next = rows[i + 1];
    return (next?.kind === 'item' ? next.start : now) - r.minutes;
  });
  return starts.map((from, i) => ({ from, to: Math.max(from, starts[i + 1] ?? Math.min(from + 120, 1435)) }));
}

/** The time a fraction of the way through a stretch, on the nearest 5 minutes. */
export function minuteAt(from: number, to: number, fraction: number): number {
  return Math.min(1435, Math.round((from + (to - from) * Math.min(1, Math.max(0, fraction))) / 5) * 5);
}

/** How much taller a row draws for its length: 15 min or none is 1x, up to 2x at two hours. */
export function lengthScale(minutes: number | null): number {
  if (!minutes || minutes <= 15) return 1;
  if (minutes <= 30) return 1 + ((minutes - 15) / 15) * 0.25;
  if (minutes <= 60) return 1.25 + ((minutes - 30) / 30) * 0.25;
  return Math.min(2, 1.5 + ((minutes - 60) / 60) * 0.5);
}

export type NextKind = 'calendar' | 'todo' | 'habit';
export type NextCandidate = { id: string; kind: NextKind; start: number | null; minutes: number | null; done: boolean };
export type Next = {
  id: string;
  kind: NextKind;
  start: number | null;
  /** until `minute`, since `minute`, in `minute` minutes, or any time today. */
  state: 'until' | 'since' | 'in' | 'any';
  minute: number;
};

/** A thing with no length counts as happening for this long after its start. */
const NO_LENGTH_ACTIVE = 15;
const NEXT_RANK: Record<NextKind, number> = { calendar: 0, todo: 1, habit: 2 };

/** The one row that is next, by the schedule alone: what's on now, else what's coming, else the first Anytime. */
export function pickNext(items: readonly NextCandidate[], now: number): Next | null {
  const open = items.filter((i) => !i.done);
  const timed = open.flatMap((i) => (i.start === null ? [] : [{ ...i, start: i.start, end: i.start + (i.minutes || NO_LENGTH_ACTIVE) }]));
  const tie = (a: NextCandidate, b: NextCandidate) => NEXT_RANK[a.kind] - NEXT_RANK[b.kind] || a.id.localeCompare(b.id);
  const on = timed.filter((i) => i.start <= now && now < i.end).sort((a, b) => a.end - b.end || tie(a, b))[0];
  if (on) return { id: on.id, kind: on.kind, start: on.start, state: on.minutes ? 'until' : 'since', minute: on.minutes ? on.end : on.start };
  const coming = timed.filter((i) => i.start > now).sort((a, b) => a.start - b.start || tie(a, b))[0];
  if (coming) return { id: coming.id, kind: coming.kind, start: coming.start, state: 'in', minute: coming.start - now };
  const any = open.find((i) => i.start === null);
  return any ? { id: any.id, kind: any.kind, start: null, state: 'any', minute: 0 } : null;
}
