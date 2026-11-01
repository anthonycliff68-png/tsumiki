import { useQuery } from '@tanstack/react-query';
import * as Calendar from 'expo-calendar';

import { localDateString } from '@/lib/dates';
import { toTimeString } from '@/lib/times';

export type DayEvent = { id: string; title: string; start: string; end: string };

/** Asks once; Apple only ever shows the popup the first time. */
export async function askForCalendar(): Promise<boolean> {
  try {
    const { granted } = await Calendar.requestCalendarPermissions();
    return granted;
  } catch {
    // A phone that cannot answer is treated like a no.
    return false;
  }
}

/**
 * Today's events from every calendar on the phone, read-only. All-day events
 * are left out: they have no place on an hour timeline. Empty when access was
 * not given, or when `enabled` is false (calendar is Pro).
 */
export function useTodayEvents(enabled: boolean) {
  const today = new Date();
  return useQuery({
    queryKey: ['calendar', localDateString(today)],
    enabled,
    queryFn: async (): Promise<DayEvent[]> => {
      const { granted } = await Calendar.getCalendarPermissions();
      if (!granted) return [];
      const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
      if (calendars.length === 0) return [];
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const events = await Calendar.listEvents(calendars, start, end);
      return events
        .filter((e) => !e.allDay)
        .map((e) => ({
          id: e.id,
          title: e.title,
          start: toTimeString(new Date(e.startDate)),
          end: toTimeString(new Date(e.endDate)),
        }))
        .sort((a, b) => a.start.localeCompare(b.start));
    },
  });
}
