import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { EVERY_DAY } from '@/data/defaults';
import { addDays, localDateString, localWeekday, minutesOfDay } from '@/lib/dates';
import type { Anchor, CrewRole, Habit, ReactionKind, ScheduleMode } from '@/lib/models';
import { supabase } from '@/lib/supabase';
import { habitColors } from '@/theme';

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['anchors'] });
      // Anchor labels and times are what Today and My Day lay the day out by.
      void queryClient.invalidateQueries({ queryKey: ['today'] });
    },
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
      void queryClient.invalidateQueries({ queryKey: ['today'] });
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

// --- crews -----------------------------------------------------------------

export type CrewSummary = {
  id: string;
  name: string;
  habitId: string;
  habitName: string;
  habitColor: string;
  streakCurrent: number;
  streakBest: number;
  memberCount: number;
};

/** Every crew you are in, with its habit and how many people are in it. */
export function useCrews(userId: string | undefined) {
  return useQuery({
    queryKey: ['crews', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<CrewSummary[]> => {
      const { data, error } = await supabase
        .from('crew_members')
        .select(
          'crews!inner(id, name, habit_id, streak_current, streak_best, habits!crews_habit_id_fkey(name, color))',
        )
        .eq('user_id', userId ?? '');
      if (error) throw error;

      const rows = data as unknown as {
        crews: {
          id: string;
          name: string;
          habit_id: string;
          streak_current: number;
          streak_best: number;
          habits: { name: string; color: string } | null;
        };
      }[];

      const crews = rows.map((row) => row.crews);
      if (crews.length === 0) return [];

      const { data: members, error: memberError } = await supabase
        .from('crew_members')
        .select('crew_id')
        .in('crew_id', crews.map((crew) => crew.id));
      if (memberError) throw memberError;

      return crews.map((crew) => ({
        id: crew.id,
        name: crew.name,
        habitId: crew.habit_id,
        habitName: crew.habits?.name ?? '',
        habitColor: crew.habits?.color ?? habitColors[0],
        streakCurrent: crew.streak_current,
        streakBest: crew.streak_best,
        memberCount: (members ?? []).filter((m) => m.crew_id === crew.id).length,
      }));
    },
  });
}

export type CrewMemberState = {
  userId: string;
  displayName: string;
  avatarColor: string;
  role: CrewRole;
  graceUsed: boolean;
  /** Checked in for the date being shown. */
  checkedIn: boolean;
  /** Their own moment for this habit. */
  anchorLabel: string | null;
  atTime: string | null;
  mode: ScheduleMode | null;
};

export type CrewDetail = {
  id: string;
  name: string;
  habitId: string;
  habitName: string;
  habitColor: string;
  streakCurrent: number;
  streakBest: number;
  members: CrewMemberState[];
  /** Oldest first: did the whole crew get through each of the last 7 days? */
  lastSevenDays: { date: string; complete: boolean; isToday: boolean }[];
};

/** One crew, with every member's state for today and the week behind it. */
export function useCrew(crewId: string | undefined, date: Date = new Date()) {
  const localDate = localDateString(date);

  return useQuery({
    queryKey: ['crew', crewId, localDate],
    enabled: Boolean(crewId),
    queryFn: async (): Promise<CrewDetail> => {
      const { data: crew, error: crewError } = await supabase
        .from('crews')
        .select('id, name, habit_id, streak_current, streak_best, habits!crews_habit_id_fkey(name, color)')
        .eq('id', crewId ?? '')
        .single();
      if (crewError) throw crewError;

      const habit = (crew as unknown as { habits: { name: string; color: string } | null }).habits;

      const [memberRows, profileRows, scheduleRows, checkinRows] = await Promise.all([
        supabase.from('crew_members').select('user_id, role, grace_used').eq('crew_id', crewId ?? ''),
        supabase.from('crew_profiles').select('id, display_name, avatar_color'),
        supabase.from('habit_schedules').select('user_id, mode, at_time, anchors(label)').eq('habit_id', crew.habit_id),
        supabase
          .from('checkins')
          .select('user_id, local_date')
          .eq('habit_id', crew.habit_id)
          .gte('local_date', localDateString(addDays(date, -6)))
          .lte('local_date', localDate),
      ]);

      if (memberRows.error) throw memberRows.error;
      if (profileRows.error) throw profileRows.error;
      if (scheduleRows.error) throw scheduleRows.error;
      if (checkinRows.error) throw checkinRows.error;

      const profiles = new Map((profileRows.data ?? []).map((p) => [p.id, p]));
      const schedules = new Map(
        (scheduleRows.data as unknown as {
          user_id: string;
          mode: ScheduleMode;
          at_time: string | null;
          anchors: { label: string } | null;
        }[]).map((s) => [s.user_id, s]),
      );
      const checkins = checkinRows.data ?? [];
      const doneToday = new Set(
        checkins.filter((c) => c.local_date === localDate).map((c) => c.user_id),
      );

      const members: CrewMemberState[] = (memberRows.data ?? []).map((member) => {
        const schedule = schedules.get(member.user_id);
        return {
          userId: member.user_id,
          displayName: profiles.get(member.user_id)?.display_name ?? 'Someone',
          avatarColor: profiles.get(member.user_id)?.avatar_color ?? habitColors[0],
          role: member.role,
          graceUsed: member.grace_used,
          checkedIn: doneToday.has(member.user_id),
          anchorLabel: schedule?.anchors?.label ?? null,
          atTime: schedule?.at_time ?? null,
          mode: schedule?.mode ?? null,
        };
      });

      // A day counts only when everyone got through it.
      const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
        const day = localDateString(addDays(date, index - 6));
        const inOnThatDay = new Set(
          checkins.filter((c) => c.local_date === day).map((c) => c.user_id),
        );
        return {
          date: day,
          complete: members.length > 0 && members.every((m) => inOnThatDay.has(m.userId)),
          isToday: day === localDate,
        };
      });

      return {
        id: crew.id,
        name: crew.name,
        habitId: crew.habit_id,
        habitName: habit?.name ?? '',
        habitColor: habit?.color ?? habitColors[0],
        streakCurrent: crew.streak_current,
        streakBest: crew.streak_best,
        members,
        lastSevenDays,
      };
    },
  });
}

/** Turn one of your solo habits into a crew. Atomic, server side. */
export function useCreateCrew(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, name }: { habitId: string; name: string }): Promise<string> => {
      const { data, error } = await supabase.rpc('create_crew', { p_habit_id: habitId, p_name: name });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crews'] });
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

export function useLeaveCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (crewId: string) => {
      const { error } = await supabase.rpc('leave_crew', { p_crew_id: crewId });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crews'] });
      void queryClient.invalidateQueries({ queryKey: ['crew'] });
      void queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

// --- nudges ----------------------------------------------------------------

export const NUDGE_MAX_LENGTH = 60;

export type ReceivedNudge = {
  id: string;
  crewId: string;
  crewName: string;
  habitId: string;
  habitName: string;
  habitColor: string;
  fromUserId: string;
  fromName: string;
  fromColor: string;
  message: string;
  checkedIn: boolean;
  /** A thanks already sent for this nudge. */
  reactionKind: ReactionKind | null;
};

/** Nudges pointed at you today, with whether you have since checked in. */
export function useNudgesForMe(userId: string | undefined, date: Date = new Date()) {
  const localDate = localDateString(date);

  return useQuery({
    queryKey: ['nudges', userId, localDate],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ReceivedNudge[]> => {
      const { data, error } = await supabase
        .from('nudges')
        .select('id, crew_id, from_user, message, crews!inner(name, habit_id, habits!crews_habit_id_fkey(name, color))')
        .eq('to_user', userId ?? '')
        .eq('local_date', localDate)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = data as unknown as {
        id: string;
        crew_id: string;
        from_user: string;
        message: string;
        crews: { name: string; habit_id: string; habits: { name: string; color: string } | null };
      }[];
      if (rows.length === 0) return [];

      const [profiles, checkins, reactions] = await Promise.all([
        supabase.from('crew_profiles').select('id, display_name, avatar_color'),
        supabase
          .from('checkins')
          .select('habit_id')
          .eq('user_id', userId ?? '')
          .eq('local_date', localDate),
        supabase.from('reactions').select('nudge_id, kind').eq('from_user', userId ?? ''),
      ]);
      if (profiles.error) throw profiles.error;
      if (checkins.error) throw checkins.error;
      if (reactions.error) throw reactions.error;

      const byId = new Map((profiles.data ?? []).map((p) => [p.id, p]));
      const done = new Set((checkins.data ?? []).map((c) => c.habit_id));
      const thanked = new Map((reactions.data ?? []).map((r) => [r.nudge_id, r.kind]));

      return rows.map((row) => ({
        id: row.id,
        crewId: row.crew_id,
        crewName: row.crews.name,
        habitId: row.crews.habit_id,
        habitName: row.crews.habits?.name ?? '',
        habitColor: row.crews.habits?.color ?? habitColors[0],
        fromUserId: row.from_user,
        fromName: byId.get(row.from_user)?.display_name ?? 'Someone',
        fromColor: byId.get(row.from_user)?.avatar_color ?? habitColors[0],
        message: row.message,
        checkedIn: done.has(row.crews.habit_id),
        reactionKind: thanked.get(row.id) ?? null,
      }));
    },
  });
}

/** Who I have already nudged today, so the crew screen can grey them out. */
export function useNudgesSentToday(userId: string | undefined, date: Date = new Date()) {
  const localDate = localDateString(date);
  return useQuery({
    queryKey: ['nudges-sent', userId, localDate],
    enabled: Boolean(userId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('nudges')
        .select('to_user')
        .eq('from_user', userId ?? '')
        .eq('local_date', localDate);
      if (error) throw error;
      return (data ?? []).map((row) => row.to_user);
    },
  });
}

export class NudgeAlreadySentError extends Error {}
export class NudgeNotAllowedError extends Error {}

/**
 * One nudge per sender → recipient per local day, and only while they still
 * have the habit open. Both rules live in the database; this turns the codes
 * it raises into something worth reading.
 */
export function useSendNudge(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      crewId,
      toUser,
      message,
      date = new Date(),
    }: {
      crewId: string;
      toUser: string;
      message: string;
      date?: Date;
    }) => {
      if (!userId) throw new Error('Not signed in.');
      const { error } = await supabase.from('nudges').insert({
        crew_id: crewId,
        from_user: userId,
        to_user: toUser,
        message: message.trim().slice(0, NUDGE_MAX_LENGTH),
        local_date: localDateString(date),
      });
      if (error) {
        if (error.code === '23505') throw new NudgeAlreadySentError(error.message);
        // The insert policy refuses once they have checked in.
        if (error.code === '42501') throw new NudgeNotAllowedError(error.message);
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['nudges-sent'] });
      void queryClient.invalidateQueries({ queryKey: ['crew'] });
    },
  });
}

/** Say thanks for a nudge. */
export function useSendReaction(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ nudgeId, kind }: { nudgeId: string; kind: ReactionKind }) => {
      if (!userId) throw new Error('Not signed in.');
      const { error } = await supabase
        .from('reactions')
        .insert({ nudge_id: nudgeId, from_user: userId, kind });
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nudges'] }),
  });
}

/**
 * "Heading out now": the crew sees it for half an hour, and reminders and
 * nudges to you hold off for the same window.
 */
export function useHeadingOut(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (crewId: string) => {
      if (!userId) throw new Error('Not signed in.');
      const { error } = await supabase.from('status_events').insert({
        crew_id: crewId,
        user_id: userId,
        kind: 'heading_out',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crew'] });
      void queryClient.invalidateQueries({ queryKey: ['statuses'] });
    },
  });
}

/** Who in the crew is on the way right now. */
export function useCrewStatuses(crewId: string | undefined) {
  return useQuery({
    queryKey: ['statuses', crewId],
    enabled: Boolean(crewId),
    refetchInterval: 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('status_events')
        .select('user_id, expires_at')
        .eq('crew_id', crewId ?? '')
        .gt('expires_at', new Date().toISOString());
      if (error) throw error;
      return (data ?? []).map((row) => row.user_id);
    },
  });
}

/** Your own profile row — name, colour, timezone, quiet hours. */
export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId ?? '')
        .single();
      if (error) throw error;
      return data;
    },
  });
}
