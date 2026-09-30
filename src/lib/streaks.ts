/**
 * A personal streak, under the same rule the crews use.
 *
 * Crews already forgive one miss and reset on the second. Doing anything else
 * for a solo habit would mean two rules to learn, so this is the same one: a
 * run survives a single missed day and ends on two in a row.
 *
 * Counted in scheduled days, never calendar days — a habit set for Mondays and
 * Thursdays is not broken by a Tuesday. The caller passes only the days the
 * habit was actually due, oldest first, which is what statsFor already builds.
 */

export type StreakState =
  /** Every recent due day done, or a forgiven miss further back. */
  | 'running'
  /** The last closed day was missed. Today still saves it. */
  | 'at-risk'
  /** Missed twice in a row, or never started. */
  | 'cold';

export type Streak = {
  /** Due days done in the current run. Zero once it has broken. */
  days: number;
  state: StreakState;
};

export type DueDay = { date: string; done: boolean };

/**
 * `today` is not yet a miss.
 *
 * A day that is scheduled and not yet checked in is still open — counting it
 * as missed would show every streak at risk each morning and then quietly fix
 * itself, which is the sort of thing that teaches people to distrust a number.
 */
export function streakOf(days: readonly DueDay[], today?: string): Streak {
  const closed =
    today !== undefined && days[days.length - 1]?.date === today && !days[days.length - 1]?.done
      ? days.slice(0, -1)
      : days;

  if (closed.length === 0) return { days: 0, state: 'cold' };

  let count = 0;
  let missesInARow = 0;
  for (let i = closed.length - 1; i >= 0; i -= 1) {
    if (closed[i]?.done) {
      count += 1;
      // A day done clears the forgiveness, exactly as a check-in clears a
      // crew member's grace.
      missesInARow = 0;
      continue;
    }
    missesInARow += 1;
    if (missesInARow === 2) break;
  }

  const last = closed[closed.length - 1];
  const previous = closed[closed.length - 2];

  if (!last?.done && previous !== undefined && !previous.done) {
    return { days: 0, state: 'cold' };
  }
  if (!last?.done) return { days: count, state: 'at-risk' };
  return { days: count, state: count === 0 ? 'cold' : 'running' };
}
