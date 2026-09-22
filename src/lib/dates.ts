/**
 * Everything in Tsumiki happens on the member's LOCAL date — their timezone,
 * not the server's. These helpers are the only place that decides what "today"
 * means on the device.
 */

/** "2026-09-21" for the given moment, in the device's own timezone. */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 0 = Sunday … 6 = Saturday, matching habit_schedules.days_of_week. */
export function localWeekday(date: Date = new Date()): number {
  return date.getDay();
}

/** "21 Sep", the canvas's big date. */
export function formatBigDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** "Sun", "Mon" … for the day pills. */
export function formatDayName(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short' });
}

/** Minutes since midnight, for ordering a day. "12:30:00" → 750. */
export function minutesOfDay(time: string | null | undefined): number {
  if (!time) return Number.MAX_SAFE_INTEGER;
  const parts = time.split(':');
  return Number(parts[0] ?? 0) * 60 + Number(parts[1] ?? 0);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
