/**
 * The day setup builds: wake and bed, the moments in between, and the times
 * guessed for them. Pure, so it is tested; nothing here may import from '@/'.
 */

export type MomentKey = 'coffee' | 'breakfast' | 'work' | 'lunch' | 'gym' | 'home' | 'dinner';

export const MOMENT_CHOICES: { key: MomentKey; label: string; emoji: string }[] = [
  { key: 'coffee', label: 'Coffee', emoji: '☕' },
  { key: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { key: 'work', label: 'Work starts', emoji: '💼' },
  { key: 'lunch', label: 'Lunch', emoji: '🥪' },
  { key: 'gym', label: 'Gym', emoji: '🏋️' },
  { key: 'home', label: 'Get home', emoji: '🏠' },
  { key: 'dinner', label: 'Dinner', emoji: '🍝' },
];

/** Roughly when each one happens. Fixed by dragging later. */
const USUAL: Record<MomentKey, string> = {
  coffee: '', // wake + 30, below
  breakfast: '', // wake + 60, below
  work: '09:00',
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
  const soon = key === 'coffee' ? 30 : key === 'breakfast' ? 60 : null;
  return inside(soon === null ? USUAL[key] : toHHMM(toMin(wake) + soon), wake, bed, soon !== null);
}

/** Where a moment somebody wrote themselves starts out. */
export const ownTime = (wake: string, bed: string) => inside('12:00', wake, bed, false);

/** Moments picked during setup, not counting Wake up and Bed. */
export const MOMENT_LIMIT = 3;

export type DayMoment = { key: string; label: string; emoji: string; time: string; endsAt?: string | null };

/** Somebody's own name, time or length for a moment, kept by its key. */
export type MomentEdit = { label?: string; time?: string; endsAt?: string | null };

export function buildDay(
  wake: string,
  bed: string,
  picked: MomentKey[],
  own: string[],
  edits: Record<string, MomentEdit> = {},
): DayMoment[] {
  const edited = (m: DayMoment): DayMoment => {
    const label = edits[m.key]?.label ?? m.label;
    return {
      ...m,
      label,
      emoji: label === m.label ? m.emoji : emojiFor(label),
      time: edits[m.key]?.time ?? m.time,
      ...(edits[m.key]?.endsAt ? { endsAt: edits[m.key]?.endsAt } : {}),
    };
  };
  const middle: DayMoment[] = [
    ...MOMENT_CHOICES.filter((m) => picked.includes(m.key)).map((m) => ({
      key: m.key,
      label: m.label,
      emoji: m.emoji,
      time: guessTime(m.key, wake, bed),
    })),
    // Keyed by place in the list, so blanking one leaves the others' edits alone.
    ...own
      .map((label, i) => ({ key: `own-${i}`, label: label.trim(), emoji: '✨', time: ownTime(wake, bed) }))
      .filter((m) => m.label),
  ]
    .map(edited)
    .sort((a, b) => sinceWake(a.time, wake) - sinceWake(b.time, wake));
  return [
    edited({ key: 'wake', label: 'Wake up', emoji: '🌅', time: wake }),
    ...middle,
    edited({ key: 'bed', label: 'Bed', emoji: '🌙', time: bed }),
  ];
}

export const HABIT_CHOICES: { id: string; name: string; emoji: string; after: string }[] = [
  { id: 'read', name: 'Read 10 pages', emoji: '📖', after: 'coffee' },
  { id: 'walk', name: '15 min walk', emoji: '🚶', after: 'lunch' },
  { id: 'water', name: 'Glass of water', emoji: '💧', after: 'wake' },
  { id: 'stretch', name: 'Stretch', emoji: '🧘', after: 'wake' },
  { id: 'journal', name: 'Journal', emoji: '✍️', after: 'dinner' },
  { id: 'vitamins', name: 'Vitamins', emoji: '💊', after: 'breakfast' },
];

/** A habit being set up: where it hangs, unless it was given a time of its own. */
export type SetupHabit = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  after: string;
  at?: string;
  /** Kept as a length, so it survives the moment it hangs off being moved. */
  minutes?: number;
};

/** A to-do being set up. With no time it sits under "To-do", off the timeline. */
export type SetupTodo = { id: string; title: string; at?: string; minutes?: number };

/**
 * The moment a habit hangs off. When that one was not picked: Wake up, or Bed
 * for an evening habit, since nobody journals at 7 AM because they skipped dinner.
 */
export function momentFor(after: string, day: DayMoment[]): DayMoment {
  const missing = after === 'dinner' ? day[day.length - 1] : day[0];
  return day.find((m) => m.key === after) ?? (missing as DayMoment);
}

const EMOJI: Record<string, string> = {
  'wake up': '🌅',
  coffee: '☕',
  breakfast: '🍳',
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
