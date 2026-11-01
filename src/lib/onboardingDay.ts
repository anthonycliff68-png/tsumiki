/**
 * The day setup builds: wake and bed, the moments in between, and the times
 * guessed for them. Pure, so it is tested; nothing here may import from '@/'.
 */

export type MomentKey = 'coffee' | 'lunch' | 'gym' | 'home' | 'dinner';

export const MOMENT_CHOICES: { key: MomentKey; label: string; emoji: string }[] = [
  { key: 'coffee', label: 'Coffee', emoji: '☕' },
  { key: 'lunch', label: 'Lunch', emoji: '🥪' },
  { key: 'gym', label: 'Gym', emoji: '🏋️' },
  { key: 'home', label: 'Get home', emoji: '🏠' },
  { key: 'dinner', label: 'Dinner', emoji: '🍝' },
];

export const PICKED_FIRST: MomentKey[] = ['coffee', 'lunch', 'home'];

/** Roughly when each one happens. Fixed by dragging later. */
const USUAL: Record<MomentKey, string> = {
  coffee: '', // wake + 30, below
  lunch: '12:30',
  gym: '17:30',
  home: '18:00',
  dinner: '19:00',
};

const toMin = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
/** Minutes after waking. A day that runs past midnight still counts forwards. */
export const sinceWake = (hhmm: string, wake: string) => (toMin(hhmm) - toMin(wake) + 1440) % 1440;
const dayLength = (wake: string, bed: string) => sinceWake(bed, wake) || 1440;

/** A guess that lands outside waking hours is pulled back inside them. */
function inside(time: string, wake: string, bed: string, early: boolean): string {
  const at = sinceWake(time, wake);
  if (at > 0 && at < dayLength(wake, bed)) return time;
  return early ? toHHMM(toMin(wake) + 60) : toHHMM(toMin(bed) - 60);
}

export function guessTime(key: MomentKey, wake: string, bed: string): string {
  const usual = key === 'coffee' ? toHHMM(toMin(wake) + 30) : USUAL[key];
  return inside(usual, wake, bed, key === 'coffee');
}

export type DayMoment = { key: string; label: string; emoji: string; time: string };

export function buildDay(wake: string, bed: string, picked: MomentKey[], own: string[]): DayMoment[] {
  const middle: DayMoment[] = [
    ...MOMENT_CHOICES.filter((m) => picked.includes(m.key)).map((m) => ({
      key: m.key,
      label: m.label,
      emoji: m.emoji,
      time: guessTime(m.key, wake, bed),
    })),
    ...own
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label, i) => ({ key: `own-${i}`, label, emoji: '✨', time: inside('12:00', wake, bed, false) })),
  ].sort((a, b) => sinceWake(a.time, wake) - sinceWake(b.time, wake));
  return [
    { key: 'wake', label: 'Wake up', emoji: '🌅', time: wake },
    ...middle,
    { key: 'bed', label: 'Bed', emoji: '🌙', time: bed },
  ];
}

export const HABIT_CHOICES: { id: string; name: string; emoji: string; after: string }[] = [
  { id: 'read', name: 'Read 10 pages', emoji: '📖', after: 'coffee' },
  { id: 'walk', name: '15 min walk', emoji: '🚶', after: 'lunch' },
  { id: 'water', name: 'Glass of water', emoji: '💧', after: 'wake' },
];

/** The moment a habit hangs off, or Wake up when that one was not picked. */
export function momentFor(after: string, day: DayMoment[]): DayMoment {
  return day.find((m) => m.key === after) ?? (day[0] as DayMoment);
}

const EMOJI: Record<string, string> = {
  'wake up': '🌅',
  coffee: '☕',
  breakfast: '🥣',
  lunch: '🥪',
  gym: '🏋️',
  'get home': '🏠',
  dinner: '🍝',
  bed: '🌙',
  'brush teeth, bed': '🌙',
  'work starts': '💼',
  work: '💼',
  'walk the dog': '🐕',
  'school run': '🎒',
};

/** Moments are stored by name only, so their emoji is looked up by name. */
export function emojiFor(label: string): string {
  return EMOJI[label.trim().toLowerCase()] ?? '✨';
}
