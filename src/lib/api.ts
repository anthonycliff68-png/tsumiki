import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { EVERY_DAY } from '@/data/defaults';
import { localDateString, localWeekday, minutesOfDay } from '@/lib/dates';
import type { Anchor, Habit, ScheduleMode } from '@/lib/models';
import { supabase } from '@/lib/supabase';

/** Row Level Security already limits every query below to the signed-in user. */

export function useAnchors(userId: string | undefined) {
  return useQuery({
    queryKey: ['anchors', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Anchor[]> => {
      const { data, error } = await supabase
        .from('anchors')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useHabits(userId: string | undefined) {
  return useQuery({
    queryKey: ['habits', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Habit[]> => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export type RoutineAnchorInput = {
  label: string;
  /** "HH:MM". */
  usualTime: string;
  isDefault: boolean;
};

/** Writes the whole routine in one go, at the end of the routine screen. */
export function useSaveRoutine(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (anchors: RoutineAnchorInput[]) => {
      if (!userId) throw new Error('Not signed in.');
      const rows = anchors.map((anchor, index) => ({
        user_id: userId,
        label: anchor.label,
        usual_time: anchor.usualTime,
        sort_order: index,
        is_default: anchor.isDefault,
      }));
      const { data, error } = await supabase.from('anchors').insert(rows).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['anchors'] }),
  });
}

export type FirstHabitInput = {
  name: string;
  color: string;
  /** The anchor this habit stacks onto. */
  anchorId: string;
};

/**
 * The first habit is always solo and always stacked onto an anchor — the crew
 * comes later, on the next screen or from the Crews tab.
 */
export function useCreateFirstHabit(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: FirstHabitInput): Promise<Habit> => {
      if (!userId) throw new Error('Not signed in.');

      const { data: habit, error: habitError } = await supabase
        .from('habits')
        .insert({ owner_id: userId, name: input.name, color: input.color })
        .select()
        .single();
      if (habitError) throw habitError;

      const { error: scheduleError } = await supabase.from('habit_schedules').insert({
        habit_id: habit.id,
        user_id: userId,
        mode: 'after',
        anchor_id: input.anchorId,
        days_of_week: EVERY_DAY,
      });
      if (scheduleError) throw scheduleError;

      return habit;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

// --- today -----------------------------------------------------------------

/** One habit as Today and My Day need it: the habit, its moment, its state. */
export type TodayHabit = {
  id: string;
  name: string;
  color: string;
  crewId: string | null;
  mode: ScheduleMode;
  /** Set when mode is 'after'. */
  anchorId: string | null;
  anchorLabel: string | null;
  /** The anchor's usual time, or the habit's set time. Null for 'anytime'. */
  time: string | null;
  checkedIn: boolean;
  /** Minutes since midnight, for ordering. Anytime habits sort last. */
  sortKey: number;
};

type ScheduleRow = {
  mode: ScheduleMode;
  at_time: string | null;
  days_of_week: number[];
  habits: { id: string; name: string; color: string; crew_id: string | null; archived_at: string | null } | null;
  anchors: { id: string; label: string; usual_time: string } | null;
};

/**
 * Everything scheduled for the given local date, in the order the day runs,
 * with today's check-ins already folded in.
 */
export function useToday(userId: string | undefined, date: Date = new Date()) {
  const localDate = localDateString(date);
  const weekday = localWeekday(date);

  return useQuery({
    queryKey: ['today', userId, localDate],
    enabled: Boolean(userId),
    queryFn: async (): Promise<TodayHabit[]> => {
      const [schedules, checkins] = await Promise.all([
        supabase
          .from('habit_schedules')
          .select(
            'mode, at_time, days_of_week, habits!inner(id, name, color, crew_id, archived_at), anchors(id, label, usual_time)',
          )
          .eq('user_id', userId ?? ''),
        supabase.from('checkins').select('habit_id').eq('user_id', userId ?? '').eq('local_date', localDate),
      ]);

      if (schedules.error) throw schedules.error;
      if (checkins.error) throw checkins.error;

      const done = new Set((checkins.data ?? []).map((row) => row.habit_id));

      return (schedules.data as unknown as ScheduleRow[])
        .filter((row) => row.habits !== null && row.habits.archived_at === null)
        .filter((row) => row.days_of_week.includes(weekday))
        .map((row) => {
          const habit = row.habits as NonNullable<ScheduleRow['habits']>;
          const time = row.mode === 'after' ? (row.anchors?.usual_time ?? null) : row.at_time;
          return {
            id: habit.id,
            name: habit.name,
            color: habit.color,
            crewId: habit.crew_id,
            mode: row.mode,
            anchorId: row.anchors?.id ?? null,
            anchorLabel: row.anchors?.label ?? null,
            time,
            checkedIn: done.has(habit.id),
            sortKey: minutesOfDay(time),
          };
        })
        .sort((a, b) => a.sortKey - b.sortKey);
    },
  });
}

/**
 * Check in. Idempotent per (habit, user, local_date) — the unique constraint
 * makes a second tap a no-op rather than an error.
 */
export function useCheckIn(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, date = new Date() }: { habitId: string; date?: Date }) => {
      if (!userId) throw new Error('Not signed in.');
      const { error } = await supabase
        .from('checkins')
        .upsert(
          { habit_id: habitId, user_id: userId, local_date: localDateString(date) },
          { onConflict: 'habit_id,user_id,local_date', ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['today'] }),
  });
}

/** Undo a check-in made by mistake. */
export function useUndoCheckIn(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, date = new Date() }: { habitId: string; date?: Date }) => {
      if (!userId) throw new Error('Not signed in.');
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('local_date', localDateString(date));
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['today'] }),
  });
}

// --- creating and editing habits -------------------------------------------

export type HabitInput = {
  name: string;
  color: string;
  mode: ScheduleMode;
  /** Required when mode is 'after'. */
  anchorId?: string | null;
  /** "HH:MM", required when mode is 'at'. */
  atTime?: string | null;
  daysOfWeek?: number[];
};

/** A habit plus the caller's own schedule for it, for the edit form. */
export function useHabitWithSchedule(userId: string | undefined, habitId: string | undefined) {
  return useQuery({
    queryKey: ['habit', userId, habitId],
    enabled: Boolean(userId && habitId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_schedules')
        .select('mode, at_time, anchor_id, days_of_week, habits!inner(id, name, color, crew_id)')
        .eq('user_id', userId ?? '')
        .eq('habit_id', habitId ?? '')
        .single();
      if (error) throw error;
      return data as unknown as {
        mode: ScheduleMode;
        at_time: string | null;
        anchor_id: string | null;
        days_of_week: number[];
        habits: { id: string; name: string; color: string; crew_id: string | null };
      };
    },
  });
}

function scheduleFields(input: HabitInput) {
  return {
    mode: input.mode,
    anchor_id: input.mode === 'after' ? (input.anchorId ?? null) : null,
    at_time: input.mode === 'at' ? (input.atTime ?? null) : null,
    days_of_week: input.daysOfWeek ?? EVERY_DAY,
  };
}

export function useCreateHabit(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: HabitInput): Promise<Habit> => {
      if (!userId) throw new Error('Not signed in.');

      const { data: habit, error: habitError } = await supabase
        .from('habits')
        .insert({ owner_id: userId, name: input.name.trim(), color: input.color })
        .select()
        .single();
      if (habitError) throw habitError;

      const { error: scheduleError } = await supabase
        .from('habit_schedules')
        .insert({ habit_id: habit.id, user_id: userId, ...scheduleFields(input) });
      if (scheduleError) throw scheduleError;

      return habit;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

export function useUpdateHabit(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, ...input }: HabitInput & { habitId: string }) => {
      if (!userId) throw new Error('Not signed in.');

      const { error: habitError } = await supabase
        .from('habits')
        .update({ name: input.name.trim(), color: input.color })
        .eq('id', habitId);
      if (habitError) throw habitError;

      const { error: scheduleError } = await supabase
        .from('habit_schedules')
        .update(scheduleFields(input))
        .eq('habit_id', habitId)
        .eq('user_id', userId);
      if (scheduleError) throw scheduleError;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['today'] });
      void queryClient.invalidateQueries({ queryKey: ['habit', userId, variables.habitId] });
    },
  });
}

/** Habits are archived, never deleted — the check-in history stays intact. */
export function useArchiveHabit(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await supabase
        .from('habits')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', habitId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
