/**
 * The order the day is shown in, and where to open it.
 *
 * Kept apart from the screen because the rule matters more than the pixels:
 * the hand must never reshuffle under someone's thumb, so nothing here is
 * allowed to look at whether a habit is done.
 */

export type Ordered = {
  id: string;
  name: string;
  /** Minutes since midnight. Habits with no set time sort last. */
  sortKey: number;
  checkedIn: boolean;
};

/**
 * Earliest first, then by name so two habits on the same moment keep a fixed
 * order. Habits with no set time land at the end: it is the only place that
 * never jumps ahead of something that does have a time, and it is where the
 * app already puts them when it sends their reminder.
 */
export function orderForDay<T extends Ordered>(habits: readonly T[]): T[] {
  return [...habits].sort((a, b) => a.sortKey - b.sortKey || a.name.localeCompare(b.name));
}

/**
 * The card to open on: the first habit still to do. On a finished day there
 * is none, so start at the top rather than on an arbitrary card.
 */
export function openFocus(habits: readonly Ordered[]): number {
  const at = habits.findIndex((habit) => !habit.checkedIn);
  return at === -1 ? 0 : at;
}
