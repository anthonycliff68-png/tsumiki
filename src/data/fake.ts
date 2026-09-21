/**
 * Static stand-in data for build step 1. It mirrors the shapes the Supabase
 * schema will return (step 2) so the components do not have to change when the
 * real queries arrive.
 */
import { habitColors } from '@/theme';

export type ScheduleMode = 'after' | 'at' | 'any';

export type UpNextHabit = {
  id: string;
  name: string;
  color: string;
  mode: ScheduleMode;
  /** Set when mode is 'after'. */
  anchorLabel?: string;
  /** Set when mode is 'at', already formatted for display. */
  atTime?: string;
  /** Null for a solo habit. */
  crewName: string | null;
  checkedIn: boolean;
};

export type TodayProgress = {
  done: number;
  total: number;
};

export const fakeUpNext: UpNextHabit = {
  id: 'habit-walk',
  name: '15 min walk',
  color: habitColors[0],
  mode: 'after',
  anchorLabel: 'After lunch',
  crewName: 'Lunch Loop',
  checkedIn: false,
};

export const fakeProgress: TodayProgress = { done: 1, total: 3 };

/** The rest of today, in order. Used to colour the other tabs' bleed. */
export const fakeRestOfDay: UpNextHabit[] = [
  {
    id: 'habit-stretch',
    name: '10 min stretch',
    color: habitColors[1],
    mode: 'after',
    anchorLabel: 'After coffee',
    crewName: 'Morning Movers',
    checkedIn: true,
  },
  {
    id: 'habit-read',
    name: 'Read 10 pages',
    color: habitColors[2],
    mode: 'after',
    anchorLabel: 'After teeth',
    crewName: 'Page Club',
    checkedIn: false,
  },
  {
    id: 'habit-workout',
    name: 'Log workout',
    color: habitColors[3],
    mode: 'at',
    atTime: '6:30 pm',
    crewName: null,
    checkedIn: false,
  },
];
