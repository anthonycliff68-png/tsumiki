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
  /** Asked for more days than they keep. Ask for fewer. */
  | { kind: 'ease-off'; from: number; to: number }
  /** Everything smaller has been tried and it still is not happening. */
  | { kind: 'let-go' }
  /** Nothing to fix — say what is working instead. */
  | { kind: 'run'; days: number };

/**
 * Advice about the week rather than about one habit.
 *
 * A crowded Monday and a week with no gap in it are properties of the whole
 * schedule; no single habit is at fault and telling one of them to move would
 * be arbitrary. They get their own answer, shown once.
 */
export type WeekAdvice =
  /** One weekday carries far more than the others, and it shows. */
  | { kind: 'crowded-day'; weekday: number; due: number }
  /** Something due every single day, and the week is sagging. */
  | { kind: 'rest-day' };

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
 * Asking for fewer days only helps if there are days to give up and something
 * left afterwards. Below two, the suggestion is to stop, not to ease off.
 */
const EASE_OFF_MIN_SCHEDULED = 4;
const EASE_OFF_MIN_SUGGESTED = 2;

/**
 * Letting go needs more evidence than anything else here, because it is the
 * only suggestion someone might resent. It waits for a long run of days, a
 * rate that is not close, and a schedule already light enough that easing off
 * has nothing left to offer.
 */
const LET_GO_BELOW = 0.25;
const LET_GO_MIN_DUE = 10;
const LET_GO_MAX_SCHEDULED = 3;

/** A weekday carrying this much, and this many times the rest, is oversubscribed. */
const CROWDED_DAY_MIN = 4;
const CROWDED_DAY_RATIO = 1.8;
/** A week with no gap is only worth mentioning once it is actually sagging. */
const REST_DAY_BELOW = 0.8;

/**
 * Advice is always read over the same trailing stretch, whatever period the
 * screen is showing. A single day cannot tell you which habit needs work, and
 * a month would be slow to notice one that has just started slipping.
 */
export const ADVICE_DAYS = 30;

export function adviceRange(periodEnd: string): { from: string; to: string } {
  return { from: shiftDate(periodEnd, -(ADVICE_DAYS - 1)), to: periodEnd };
}

/** How many weekdays this habit is actually asked for. */
export function scheduledDays(stats: HabitStats): number {
  return stats.byWeekday.filter((day) => day.due > 0).length;
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
    const scheduled = scheduledDays(stats);

    // The hardest thing to say, so it waits for the most evidence: a long
    // stretch of days, a rate nowhere near, and a schedule already so light
    // that asking for less is not an option.
    if (
      stats.due >= LET_GO_MIN_DUE &&
      stats.rate < LET_GO_BELOW &&
      scheduled <= LET_GO_MAX_SCHEDULED
    ) {
      return { kind: 'let-go' };
    }

    // Otherwise: they are keeping it some of the time, so ask for the number
    // of days they are actually keeping. Changing the schedule is a fix;
    // trying harder is not.
    if (scheduled >= EASE_OFF_MIN_SCHEDULED) {
      const to = Math.max(EASE_OFF_MIN_SUGGESTED, Math.round(stats.rate * scheduled));
      if (to < scheduled) return { kind: 'ease-off', from: scheduled, to };
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

/**
 * One thing to say about the week as a whole, or nothing.
 *
 * Crowding beats rest: a Monday carrying six habits is a specific, fixable
 * problem, and suggesting a day off instead would be answering a question
 * nobody asked.
 */
export function adviseWeek(all: readonly HabitStats[]): WeekAdvice | null {
  const due = Array.from({ length: 7 }, () => 0);
  const done = Array.from({ length: 7 }, () => 0);
  for (const stats of all) {
    for (const day of stats.byWeekday) {
      due[day.weekday] = (due[day.weekday] ?? 0) + day.due;
      done[day.weekday] = (done[day.weekday] ?? 0) + day.done;
    }
  }

  const totalDue = due.reduce((a, b) => a + b, 0);
  if (totalDue === 0) return null;

  // The busiest day, and how it compares with an average of the others.
  let busiest = 0;
  for (let i = 1; i < 7; i += 1) if ((due[i] ?? 0) > (due[busiest] ?? 0)) busiest = i;
  const busiestDue = due[busiest] ?? 0;
  const restDue = totalDue - busiestDue;
  const restAverage = restDue / 6;

  if (
    busiestDue >= CROWDED_DAY_MIN &&
    restAverage > 0 &&
    busiestDue >= restAverage * CROWDED_DAY_RATIO
  ) {
    const busiestRate = busiestDue === 0 ? 1 : (done[busiest] ?? 0) / busiestDue;
    const overallRate = (done.reduce((a, b) => a + b, 0)) / totalDue;
    // Only a problem if the crowding is actually costing something.
    if (busiestRate < overallRate) {
      return { kind: 'crowded-day', weekday: busiest, due: busiestDue };
    }
  }

  const everyDay = due.every((d) => d > 0);
  const overall = done.reduce((a, b) => a + b, 0) / totalDue;
  if (everyDay && overall < REST_DAY_BELOW) return { kind: 'rest-day' };

  return null;
}
