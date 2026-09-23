import { currentRun, shiftDate, type HabitStats } from './stats.ts';

/**
 * Where a habit sits in the day. Stats do not need this, but advice does: the
 * fix for a habit you keep missing usually has more to do with when you have
 * asked yourself to do it than with the habit itself.
 */
export type Placement = {
  mode: 'after' | 'at' | 'any';
  anchorLabel: string | null;
  /** How many habits share this one's anchor, itself included. */
  anchorLoad: number;
};

export type Advice =
  /** Floating with no anchor, and it shows. */
  | { kind: 'stack' }
  /** One weekday is dragging the rest down. */
  | { kind: 'drop-day'; weekday: number }
  /** Its anchor is carrying too much. */
  | { kind: 'lighten'; anchorLabel: string; load: number }
  /** Nothing to fix — say what is working instead. */
  | { kind: 'run'; days: number };

export type Verdict = {
  habitId: string;
  name: string;
  color: string;
  due: number;
  done: number;
  rate: number;
  run: number;
  advice: Advice | null;
};

/** Under this and a habit wants attention; at or over `GOING_WELL_AT` it is working. */
export const NEEDS_WORK_BELOW = 0.8;
export const GOING_WELL_AT = 0.9;

/** Fewer due days than this in the window and there is nothing to judge yet. */
const MIN_DUE = 3;
/** A weekday this bad, when the habit is otherwise fine, is the thing to change. */
const WEAK_DAY_AT = 0.34;
const WEAK_DAY_GAP = 0.3;
const WEAK_DAY_MIN_DUE = 2;
/** An anchor carrying this many habits is a queue, not a cue. */
const CROWDED_ANCHOR = 4;
const GOOD_RUN = 7;

/**
 * Advice is always read over the same trailing stretch, whatever period the
 * screen is showing. A single day cannot tell you which habit needs work, and
 * a month would be slow to notice one that has just started slipping.
 */
export const ADVICE_DAYS = 30;

export function adviceRange(periodEnd: string): { from: string; to: string } {
  return { from: shiftDate(periodEnd, -(ADVICE_DAYS - 1)), to: periodEnd };
}

/** The weekday pulling a habit down, or null when no single day stands out. */
export function weakestWeekday(stats: HabitStats): number | null {
  if (stats.rate === null) return null;
  let worst: { weekday: number; rate: number } | null = null;
  for (const day of stats.byWeekday) {
    if (day.due < WEAK_DAY_MIN_DUE) continue;
    const rate = day.done / day.due;
    if (worst === null || rate < worst.rate) worst = { weekday: day.weekday, rate };
  }
  if (worst === null) return null;
  if (worst.rate > WEAK_DAY_AT) return null;
  // Only worth saying when the rest of the week is meaningfully better.
  if (stats.rate - worst.rate < WEAK_DAY_GAP) return null;
  return worst.weekday;
}

/**
 * One suggestion per habit, most specific first: a bad weekday is a smaller,
 * likelier fix than moving the habit, and moving it beats telling someone who
 * is already on a run that nothing is wrong.
 */
export function adviseOne(stats: HabitStats, placement: Placement): Advice | null {
  if (stats.rate === null || stats.due < MIN_DUE) return null;

  // Something to fix always outranks something to celebrate, or a habit sitting
  // in the needs-work list gets told to leave it alone.
  if (stats.rate < GOING_WELL_AT) {
    const weekday = weakestWeekday(stats);
    if (weekday !== null) return { kind: 'drop-day', weekday };
  }

  if (stats.rate < NEEDS_WORK_BELOW) {
    if (placement.mode === 'any') return { kind: 'stack' };
    if (
      placement.mode === 'after' &&
      placement.anchorLabel !== null &&
      placement.anchorLoad >= CROWDED_ANCHOR
    ) {
      return { kind: 'lighten', anchorLabel: placement.anchorLabel, load: placement.anchorLoad };
    }
    // Slipping, but nothing specific to point at. Better to say nothing than
    // to congratulate it on a run.
    return null;
  }

  const run = currentRun(stats);
  if (run >= GOOD_RUN) return { kind: 'run', days: run };
  return null;
}

export function verdictFor(stats: HabitStats, placement: Placement): Verdict {
  return {
    habitId: stats.habitId,
    name: stats.name,
    color: stats.color,
    due: stats.due,
    done: stats.done,
    rate: stats.rate ?? 0,
    run: currentRun(stats),
    advice: adviseOne(stats, placement),
  };
}

/**
 * The two lists the screen shows as separate tabs. A habit with too little
 * history sits in neither: it has not earned praise and does not deserve
 * blame. Needs work is worst first, so the top row is always the next thing
 * to fix; going well is best first.
 */
export function splitVerdicts(
  all: HabitStats[],
  placements: Map<string, Placement>,
): { needsWork: Verdict[]; goingWell: Verdict[] } {
  const needsWork: Verdict[] = [];
  const goingWell: Verdict[] = [];

  for (const stats of all) {
    if (stats.rate === null || stats.due < MIN_DUE) continue;
    const placement = placements.get(stats.habitId) ?? {
      mode: 'any' as const,
      anchorLabel: null,
      anchorLoad: 0,
    };
    const verdict = verdictFor(stats, placement);
    if (verdict.rate < NEEDS_WORK_BELOW) needsWork.push(verdict);
    else if (verdict.rate >= GOING_WELL_AT || verdict.run >= GOOD_RUN) goingWell.push(verdict);
  }

  needsWork.sort((a, b) => a.rate - b.rate || b.due - a.due);
  goingWell.sort((a, b) => b.rate - a.rate || b.run - a.run);
  return { needsWork, goingWell };
}
