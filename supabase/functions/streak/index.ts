/**
 * The nightly streak job.
 *
 * Runs every hour rather than once a night, because "the day has ended" is a
 * different moment for every crew: a crew spread across Auckland and Honolulu
 * only finishes a day when its slowest time zone rolls over. Each crew is
 * judged on every date that has ended for all of its members and has not been
 * judged yet, so a missed run catches up by itself and a repeat run does
 * nothing.
 *
 * The rules themselves live in ../_shared/streak.ts, under test.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  datesToEvaluate,
  evaluateDay,
  lastCompletedDate,
  type CrewState,
  type MemberState,
} from '../_shared/streak.ts';

type CrewRow = {
  id: string;
  habit_id: string;
  streak_current: number;
  streak_best: number;
  streak_updated_on: string | null;
};

Deno.serve(async (request: Request) => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return Response.json({ error: 'missing service credentials' }, { status: 500 });
  }

  // The service role bypasses RLS, which is the point: only this job writes
  // streak fields.
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const now = new Date();
  const summary: Record<string, unknown>[] = [];

  const { data: crews, error: crewError } = await supabase
    .from('crews')
    .select('id, habit_id, streak_current, streak_best, streak_updated_on');
  if (crewError) return Response.json({ error: crewError.message }, { status: 500 });

  for (const crew of (crews ?? []) as CrewRow[]) {
    const { data: memberRows, error: memberError } = await supabase
      .from('crew_members')
      .select('user_id, grace_used, profiles!inner(timezone)')
      .eq('crew_id', crew.id);
    if (memberError) {
      summary.push({ crew: crew.id, error: memberError.message });
      continue;
    }

    const members = (memberRows ?? []) as unknown as {
      user_id: string;
      grace_used: boolean;
      profiles: { timezone: string };
    }[];
    if (members.length === 0) continue;

    const { data: scheduleRows } = await supabase
      .from('habit_schedules')
      .select('user_id, days_of_week')
      .eq('habit_id', crew.habit_id);
    const scheduleByUser = new Map(
      (scheduleRows ?? []).map((row) => [row.user_id, row.days_of_week as number[]]),
    );

    const through = lastCompletedDate(members.map((member) => member.profiles.timezone), now);
    if (!through) continue;

    const dates = datesToEvaluate(crew.streak_updated_on, through);
    if (dates.length === 0) continue;

    const { data: checkinRows } = await supabase
      .from('checkins')
      .select('user_id, local_date')
      .eq('habit_id', crew.habit_id)
      .gte('local_date', dates[0])
      .lte('local_date', dates[dates.length - 1]);

    const checkinsByDate = new Map<string, Set<string>>();
    for (const row of checkinRows ?? []) {
      const set = checkinsByDate.get(row.local_date) ?? new Set<string>();
      set.add(row.user_id);
      checkinsByDate.set(row.local_date, set);
    }

    let state: CrewState = {
      streakCurrent: crew.streak_current,
      streakBest: crew.streak_best,
      members: members.map<MemberState>((member) => ({
        userId: member.user_id,
        daysOfWeek: scheduleByUser.get(member.user_id) ?? [],
        graceUsed: member.grace_used,
      })),
    };

    const outcomes: string[] = [];
    for (const date of dates) {
      const result = evaluateDay(state, date, checkinsByDate.get(date) ?? new Set());
      outcomes.push(`${date}:${result.outcome}`);
      state = {
        streakCurrent: result.streakCurrent,
        streakBest: result.streakBest,
        members: result.members,
      };
    }

    const { error: writeError } = await supabase
      .from('crews')
      .update({
        streak_current: state.streakCurrent,
        streak_best: state.streakBest,
        streak_updated_on: through,
      })
      .eq('id', crew.id);
    if (writeError) {
      summary.push({ crew: crew.id, error: writeError.message });
      continue;
    }

    // Only write the members whose grace actually moved.
    for (const member of state.members) {
      const before = members.find((row) => row.user_id === member.userId);
      if (before && before.grace_used !== member.graceUsed) {
        await supabase
          .from('crew_members')
          .update({ grace_used: member.graceUsed })
          .eq('crew_id', crew.id)
          .eq('user_id', member.userId);
      }
    }

    summary.push({
      crew: crew.id,
      through,
      streak: state.streakCurrent,
      best: state.streakBest,
      outcomes,
    });
  }

  return Response.json({ ranAt: now.toISOString(), crews: summary });
});
