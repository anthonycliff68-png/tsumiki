/**
 * The order the day is shown in, and where to open it.
 *
 * Kept apart from the screen because the rule matters more than the pixels.
 */

/** Where a habit sits on My Day. */
export type Placement = 'moment' | 'hour' | 'anytime';

export type Placeable = {
  mode: 'after' | 'at' | 'any';
  anchorId: string | null;
  time: string | null;
};

/**
 * Which of the three places on My Day a habit belongs to.
 *
 * Written as one total function because the bug it replaces was the absence
 * of a third branch: the grid collected habits twice, once per anchor and
 * once per hour, and anything matching neither filter was simply never drawn.
 * An "anytime" habit matched neither, so the header counted it, the dock
 * counted it, the New Habit screen promised it would "land on My Day", and
 * the day it landed on had no row for it.
 *
 * The two half-states fall the same way, and for the same reason: a habit set
 * to a moment that no longer exists, or to a time that never got saved, has
 * nothing to sort on. "Anytime" is the honest answer for all three — it is
 * where the app already sends their reminder, and it is the one place that
 * cannot claim a time the person did not pick.
 */
export function placementOf(habit: Placeable): Placement {
  if (habit.mode === 'after' && habit.anchorId !== null) return 'moment';
  if (habit.mode === 'at' && habit.time !== null) return 'hour';
  return 'anytime';
}

export type Ordered = {
  id: string;
  name: string;
  /** Minutes since midnight. Habits with no set time sort last. */
  sortKey: number;
  checkedIn: boolean;
};

/**
 * What is left to do, in the order it happens; then what is already done, in
 * the same order behind it.
 *
 * Done last is the point: the front of the hand should always be the next
 * thing to do, so finishing one deals it away and brings the next forward.
 * Within each half it is earliest first, then by name so two habits on the
 * same moment keep a fixed order.
 *
 * Habits with no set time land at the end of their own half. They are the only
 * ones with nothing to sort on, and the end is the only place that never
 * jumps ahead of something that does have a time — it is also where the app
 * already puts them when it sends their reminder.
 *
 * This does reshuffle the hand when you check in, which it deliberately used
 * not to do. The fan compensates: it holds the slot rather than following the
 * habit that moved, so the card under your thumb becomes the next one to do
 * rather than the one you just finished.
 */
export function orderForDay<T extends Ordered>(habits: readonly T[]): T[] {
  return [...habits].sort(
    (a, b) =>
      Number(a.checkedIn) - Number(b.checkedIn) ||
      a.sortKey - b.sortKey ||
      a.name.localeCompare(b.name),
  );
}

/**
 * The card to open on: the first habit still to do. On a finished day there
 * is none, so start at the top rather than on an arbitrary card.
 *
 * Since the order above puts the open ones first this is now always the front
 * of the hand, but it stays written as the question rather than the answer —
 * it is the order's job to decide where that lands, not this one's.
 */
export function openFocus(habits: readonly Ordered[]): number {
  const at = habits.findIndex((habit) => !habit.checkedIn);
  return at === -1 ? 0 : at;
}
