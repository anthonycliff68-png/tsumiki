// The clock helpers live in lib/times so they can be unit tested: this file
// imports from '@/theme', and node --test cannot resolve the alias.
export { formatTime, formatTimeGutter, fromTimeString, toTimeString } from '@/lib/times';

/** Every day of the week, the default schedule for a new habit. */
/**
 * The faces to choose from.
 *
 * A fixed set rather than the system emoji keyboard: a crew tile is 32px, and
 * plenty of emoji are unreadable at that size or are two glyphs wide. These
 * were picked to stay distinct from each other when they are small and next to
 * one another, which is the only place they are ever seen.
 */
export const PROFILE_EMOJI = [
  '\u{1F98A}', '\u{1F43B}', '\u{1F438}', '\u{1F989}',
  '\u{1F419}', '\u{1F98B}', '\u{1F335}', '\u{1F344}',
  '\u{26A1}', '\u{1F525}', '\u{1F319}', '\u{2B50}',
  '\u{1F30A}', '\u{1F3A7}', '\u{2615}', '\u{1F3C0}',
] as const;

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/**
 * The timeline gutter. Every time says whether it is morning or afternoon —
 * a bare "11:00" sitting under "12:30" reads as though the day ran backwards.
 * On the hour drops the minutes, since the gutter is narrow.
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];

function sameDays(a: number[], b: number[]): boolean {
  return a.length === b.length && [...a].sort().every((day, i) => day === [...b].sort()[i]);
}

/** "Every day", "Weekdays", or the days themselves. */
export function describeDays(days: number[]): string {
  if (days.length === 0) return 'No days';
  if (days.length === 7) return 'Every day';
  if (sameDays(days, WEEKDAYS)) return 'Weekdays';
  if (sameDays(days, WEEKENDS)) return 'Weekends';
  return [...days]
    .sort()
    .map((day) => DAY_NAMES[day] ?? '')
    .join(', ');
}
