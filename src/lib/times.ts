/**
 * Turning a stored "HH:MM" into something a person reads, and back.
 *
 * Kept apart from the rest of the defaults because these are pure and worth a
 * test: the compact form used to omit am/pm entirely, so a routine row read
 * "1:30" and meant either half past one in the afternoon or the middle of the
 * night. Nothing about that was visible until someone said so.
 */

/** "22:30" or "22:30:00" → "10:30 pm", the canvas's format. */
export function formatTime(value: string): string {
  const parts = value.split(':');
  const hours = Number(parts[0] ?? 0);
  const minutes = parts[1] ?? '00';
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
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
 * The compact form: "1 pm" on the hour, "1:30 pm" otherwise. Used where the
 * time is a label beside something else rather than the thing being read.
 */
export function formatTimeGutter(value: string): string {
  const parts = value.split(':');
  const hours = Number(parts[0] ?? 0);
  const minutes = parts[1] ?? '00';
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === '00' ? `${hour12} ${suffix}` : `${hour12}:${minutes} ${suffix}`;
}
