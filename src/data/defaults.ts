/**
 * The routine and habit suggestions onboarding starts from.
 * Artboards: OnbRoutine, OnbHabit.
 */
import { habitColors } from '@/theme';

export type AnchorSeed = {
  /** Stable key, used to match habit suggestions to anchors. */
  key: string;
  label: string;
  /** 24-hour "HH:MM", the shape Postgres `time` wants. */
  usualTime: string;
};

/** Prefilled on the routine screen. Times are rough on purpose. */
export const DEFAULT_ANCHORS: AnchorSeed[] = [
  { key: 'wake', label: 'Wake up', usualTime: '07:00' },
  { key: 'coffee', label: 'Coffee', usualTime: '08:15' },
  { key: 'work', label: 'Work starts', usualTime: '09:00' },
  { key: 'lunch', label: 'Lunch', usualTime: '12:30' },
  { key: 'teeth', label: 'Brush teeth, bed', usualTime: '22:30' },
];

/** Offered as chips underneath, added only if tapped. */
export const EXTRA_ANCHORS: AnchorSeed[] = [
  { key: 'gym', label: 'Gym', usualTime: '18:00' },
  { key: 'school', label: 'School run', usualTime: '08:30' },
  { key: 'dog', label: 'Walk the dog', usualTime: '17:30' },
];

export type HabitSuggestion = {
  id: string;
  name: string;
  color: string;
  /** Which anchor this one hangs off, by AnchorSeed key. */
  anchorKey: string;
};

/**
 * Six suggestions, each already matched to a moment in the day. Ordered as the
 * canvas lays them out, reading across.
 */
export const HABIT_SUGGESTIONS: HabitSuggestion[] = [
  { id: 'stretch', name: '10 min stretch', color: habitColors[1], anchorKey: 'coffee' },
  { id: 'walk', name: '15 min walk', color: habitColors[0], anchorKey: 'lunch' },
  { id: 'read', name: 'Read 10 pages', color: habitColors[2], anchorKey: 'teeth' },
  { id: 'vitamins', name: 'Take vitamins', color: habitColors[4], anchorKey: 'wake' },
  { id: 'water', name: 'Drink a glass of water', color: habitColors[3], anchorKey: 'work' },
  { id: 'write', name: 'Write one line', color: habitColors[5], anchorKey: 'teeth' },
];

/** Every day of the week, the default schedule for a new habit. */
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/** "22:30" or "22:30:00" → "10:30 pm", the canvas's format. */
export function formatTime(value: string): string {
  const parts = value.split(':');
  const hours = Number(parts[0] ?? 0);
  const minutes = parts[1] ?? '00';
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

/** The short form the canvas uses on anchor buttons: "7:00", "12:30". */
export function formatTimeShort(value: string): string {
  const parts = value.split(':');
  const hours = Number(parts[0] ?? 0);
  const minutes = parts[1] ?? '00';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes}`;
}

/** Date → "HH:MM" for storage. */
export function toTimeString(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** "HH:MM" → a Date today at that time, for the picker. */
export function fromTimeString(value: string): Date {
  const parts = value.split(':');
  const date = new Date();
  date.setHours(Number(parts[0] ?? 0), Number(parts[1] ?? 0), 0, 0);
  return date;
}

/**
 * The timeline gutter. Every time says whether it is morning or afternoon —
 * a bare "11:00" sitting under "12:30" reads as though the day ran backwards.
 * On the hour drops the minutes, since the gutter is narrow.
 */
export function formatTimeGutter(value: string): string {
  const parts = value.split(':');
  const hours = Number(parts[0] ?? 0);
  const minutes = parts[1] ?? '00';
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === '00' ? `${hour12} ${suffix}` : `${hour12}:${minutes} ${suffix}`;
}
