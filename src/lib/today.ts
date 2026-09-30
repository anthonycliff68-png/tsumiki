/**
 * The order the day is shown in, and where to open it.
 *
 * Kept apart from the screen because the rule matters more than the pixels.
 */

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
