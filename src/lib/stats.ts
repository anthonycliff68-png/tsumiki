/**
 * How often a habit actually gets done.
 *
 * The charts are the easy half. The hard half is the denominator: a day only
 * counts against you if the habit was due that weekday, already existed, and
 * had not been archived. Get that wrong and every percentage is quietly wrong,
 * so it lives here as pure functions with tests.
 */

export type StatsWindow = 'day' | 'week' | 'month';

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

/** The Sunday that opens this date's week. */
export function startOfWeek(date: string): string {
  return shiftDate(date, -weekdayOf(date));
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: string): string {
  const [y, m] = date.split('-').map(Number);
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(y ?? 1970, m ?? 1, 0));
  return last.toISOString().slice(0, 10);
}

export function shiftMonth(date: string, months: number): string {
  const [y, m] = date.split('-').map(Number);
  const at = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 + months, 1));
  return at.toISOString().slice(0, 10);
}

/**
 * The period on screen: a real day, a Sunday-to-Saturday week, or a calendar
 * month, stepped back by `offset`. Fixed periods rather than rolling windows,
 * so a week always means the same seven days to everyone looking at it.
 */
export function periodRange(
  window: StatsWindow,
  today: string,
  offset = 0,
): { from: string; to: string } {
  if (window === 'day') {
    const day = shiftDate(today, -offset);
    return { from: day, to: day };
  }
  if (window === 'week') {
    const from = shiftDate(startOfWeek(today), -7 * offset);
    return { from, to: shiftDate(from, 6) };
  }
  const first = shiftMonth(startOfMonth(today), -offset);
  return { from: first, to: endOfMonth(first) };
}

/**
 * Was this habit due on this date?
 *
 * Before the habit existed, only a day you actually logged counts — backfilling
 * last week through the day pills is real history and should show up, but the
 * empty weeks before you thought of the habit are not misses.
 */
export function isDue(habit: HabitInput, date: string, today?: string): boolean {
  // A day that has not happened yet cannot have been missed.
  if (today !== undefined && date > today) return false;
  if (!habit.daysOfWeek.includes(weekdayOf(date))) return false;
  if (habit.archivedOn !== null && date >= habit.archivedOn) return false;
  if (date < habit.createdOn) return habit.checkedOn.includes(date);
  return true;
}

export function statsFor(
  habit: HabitInput,
  from: string,
  to: string,
  today?: string,
): HabitStats {
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
    if (!isDue(habit, date, today)) continue;
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

export type DayState = 'done' | 'missed' | 'not-due' | 'future';

/**
 * Every date in the window, including the ones the habit never owed you, so a
 * calendar can tell "you missed it" apart from "it was never on".
 */
export function calendarFor(
  habit: HabitInput,
  from: string,
  to: string,
  today?: string,
): { date: string; state: DayState }[] {
  const checked = new Set(habit.checkedOn);
  return datesBetween(from, to).map((date) => {
    if (checked.has(date)) return { date, state: 'done' as DayState };
    if (today !== undefined && date > today) return { date, state: 'future' as DayState };
    return { date, state: isDue(habit, date, today) ? 'missed' : 'not-due' };
  });
}
