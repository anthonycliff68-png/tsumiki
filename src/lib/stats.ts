/**
 * How often a habit actually gets done.
 *
 * The charts are the easy half. The hard half is the denominator: a day only
 * counts against you if the habit was due that weekday, already existed, and
 * had not been archived. Get that wrong and every percentage is quietly wrong,
 * so it lives here as pure functions with tests.
 */

export type StatsWindow = 'week' | 'month' | 'all';

export type HabitInput = {
  habitId: string;
  name: string;
  color: string;
  /** 0 = Sunday … 6 = Saturday. */
  daysOfWeek: number[];
  /** "YYYY-MM-DD", the day the habit started counting. */
  createdOn: string;
  /** "YYYY-MM-DD", the day it stopped, or null. */
  archivedOn: string | null;
  /** Local dates it was checked in on. */
  checkedOn: string[];
};

export type WeekdayStat = { weekday: number; due: number; done: number };

export type HabitStats = {
  habitId: string;
  name: string;
  color: string;
  due: number;
  done: number;
  /** 0–1, or null when nothing was ever due in the window. */
  rate: number | null;
  byWeekday: WeekdayStat[];
  /** Oldest first, one entry per due day. */
  days: { date: string; done: boolean }[];
};

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const at = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

/** Every date from `from` to `to`, oldest first. Capped so a long history cannot hang the screen. */
export function datesBetween(from: string, to: string, limit = 400): string[] {
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to && dates.length < limit) {
    dates.push(cursor);
    cursor = shiftDate(cursor, 1);
  }
  return dates;
}

/**
 * Where a window starts. Week and month are rolling — the last 7 and 30 days,
 * today included — rather than calendar boundaries, so the number means the
 * same thing whichever day you open it.
 */
export function windowStart(window: StatsWindow, today: string, earliest: string): string {
  if (window === 'week') return shiftDate(today, -6);
  if (window === 'month') return shiftDate(today, -29);
  return earliest;
}

/**
 * Was this habit due on this date?
 *
 * Before the habit existed, only a day you actually logged counts — backfilling
 * last week through the day pills is real history and should show up, but the
 * empty weeks before you thought of the habit are not misses.
 */
export function isDue(habit: HabitInput, date: string): boolean {
  if (!habit.daysOfWeek.includes(weekdayOf(date))) return false;
  if (habit.archivedOn !== null && date >= habit.archivedOn) return false;
  if (date < habit.createdOn) return habit.checkedOn.includes(date);
  return true;
}

export function statsFor(habit: HabitInput, from: string, to: string): HabitStats {
  const checked = new Set(habit.checkedOn);
  const byWeekday: WeekdayStat[] = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    due: 0,
    done: 0,
  }));
  const days: { date: string; done: boolean }[] = [];
  let due = 0;
  let done = 0;

  for (const date of datesBetween(from, to)) {
    if (!isDue(habit, date)) continue;
    const wasDone = checked.has(date);
    due += 1;
    if (wasDone) done += 1;

    const weekday = byWeekday[weekdayOf(date)];
    if (weekday) {
      weekday.due += 1;
      if (wasDone) weekday.done += 1;
    }
    days.push({ date, done: wasDone });
  }

  return {
    habitId: habit.habitId,
    name: habit.name,
    color: habit.color,
    due,
    done,
    rate: due === 0 ? null : done / due,
    byWeekday,
    days,
  };
}

export type Overall = { due: number; done: number; rate: number | null };

export function overallOf(all: HabitStats[]): Overall {
  const due = all.reduce((sum, habit) => sum + habit.due, 0);
  const done = all.reduce((sum, habit) => sum + habit.done, 0);
  return { due, done, rate: due === 0 ? null : done / due };
}

/**
 * The run of due days ending today (or at the last due day) that were all done.
 * Per habit, unlike the crew streak, and with no grace.
 */
export function currentRun(stats: HabitStats): number {
  let run = 0;
  for (let i = stats.days.length - 1; i >= 0; i -= 1) {
    if (!stats.days[i]?.done) break;
    run += 1;
  }
  return run;
}

export function bestRun(stats: HabitStats): number {
  let best = 0;
  let run = 0;
  for (const day of stats.days) {
    run = day.done ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}
