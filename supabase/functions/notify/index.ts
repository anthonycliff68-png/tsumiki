/**
 * Everything that buzzes a phone: habit reminders, held nudges, and the
 * "streak saved" note when a crew finishes its day.
 *
 * Runs every ten minutes. Each send is recorded in notification_sends, so a
 * repeat run is silent and a missed run catches up at the next tick. The rules
 * about when a push may go out live in ../_shared/delivery.ts, under test.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  momentOf,
  nudgeBody,
  shouldDeliverNudge,
  shouldSendReminder,
  type ScheduleMode,
} from '../_shared/delivery.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  categoryId?: string;
  sound?: 'default';
};

/** Local date and minute-of-day for a time zone, right now. */
function localNow(timezone: string, now: Date): { date: string; minutes: number; weekday: number } {
  const safe = (fn: () => string) => {
    try {
      return fn();
    } catch {
      return '';
    }
  };
  const date =
    safe(() =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now),
    ) || now.toISOString().slice(0, 10);
  const time =
    safe(() =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now),
    ) || now.toISOString().slice(11, 16);
  const [hours, minutes] = time.split(':').map(Number);
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).getUTCDay();
  return { date, minutes: (hours ?? 0) * 60 + (minutes ?? 0), weekday };
}

async function sendPush(messages: PushMessage[]): Promise<number> {
  if (messages.length === 0) return 0;
  // Expo takes up to 100 messages at a time.
  for (let i = 0; i < messages.length; i += 100) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
    if (!response.ok) {
      console.error('expo push failed', response.status, await response.text());
    }
  }
  return messages.length;
}

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return Response.json({ error: 'missing service credentials' }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const now = new Date();
  const messages: PushMessage[] = [];
  const sends: { user_id: string; kind: string; ref_id: string; local_date: string }[] = [];

  // Everyone who can actually receive a push.
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, timezone, push_token, quiet_start, quiet_end')
    .not('push_token', 'is', null);
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 });
  if (!profiles || profiles.length === 0) {
    return Response.json({ ranAt: now.toISOString(), sent: 0, note: 'no push tokens registered' });
  }

  const userIds = profiles.map((profile) => profile.id);

  const [schedules, checkins, sent, statuses, nudges] = await Promise.all([
    supabase
      .from('habit_schedules')
      .select('habit_id, user_id, mode, at_time, days_of_week, anchors(usual_time), habits!inner(name, crew_id, archived_at)')
      .in('user_id', userIds),
    supabase.from('checkins').select('habit_id, user_id, local_date').in('user_id', userIds),
    supabase.from('notification_sends').select('user_id, kind, ref_id, local_date').in('user_id', userIds),
    supabase.from('status_events').select('user_id, expires_at').gt('expires_at', now.toISOString()),
    supabase
      .from('nudges')
      .select('id, crew_id, from_user, to_user, message, local_date, status, crews!inner(name, habit_id)')
      .eq('status', 'sent'),
  ]);

  const byProfile = new Map(profiles.map((profile) => [profile.id, profile]));
  const doneKey = (habit: string, user: string, date: string) => `${habit}|${user}|${date}`;
  const done = new Set(
    (checkins.data ?? []).map((row) => doneKey(row.habit_id, row.user_id, row.local_date)),
  );
  const sentKey = (user: string, kind: string, ref: string, date: string) =>
    `${user}|${kind}|${ref}|${date}`;
  const alreadySent = new Set(
    (sent.data ?? []).map((row) => sentKey(row.user_id, row.kind, row.ref_id, row.local_date)),
  );
  const pausedUntil = new Map<string, number>();
  for (const row of statuses.data ?? []) {
    const minutesLeft = Math.max(
      0,
      Math.round((new Date(row.expires_at).getTime() - now.getTime()) / 60000),
    );
    pausedUntil.set(row.user_id, Math.max(pausedUntil.get(row.user_id) ?? 0, minutesLeft));
  }

  // --- reminders ---
  type ScheduleRow = {
    habit_id: string;
    user_id: string;
    mode: ScheduleMode;
    at_time: string | null;
    days_of_week: number[];
    anchors: { usual_time: string } | null;
    habits: { name: string; crew_id: string | null; archived_at: string | null };
  };

  for (const row of (schedules.data ?? []) as unknown as ScheduleRow[]) {
    const profile = byProfile.get(row.user_id);
    if (!profile || !profile.push_token) continue;
    if (row.habits.archived_at !== null) continue;

    const local = localNow(profile.timezone, now);
    const decision = shouldSendReminder({
      mode: row.mode,
      anchorTime: row.anchors?.usual_time ?? null,
      atTime: row.at_time,
      nowMinutes: local.minutes,
      weekday: local.weekday,
      daysOfWeek: row.days_of_week,
      checkedIn: done.has(doneKey(row.habit_id, row.user_id, local.date)),
      alreadySent: alreadySent.has(sentKey(row.user_id, 'reminder', row.habit_id, local.date)),
      quietStart: profile.quiet_start,
      quietEnd: profile.quiet_end,
      pausedForMinutes: pausedUntil.get(row.user_id) ?? 0,
    });
    if (!decision.send) continue;

    messages.push({
      to: profile.push_token,
      title: row.habits.name,
      body: 'Time to stack it on.',
      categoryId: 'habit',
      sound: 'default',
      data: { kind: 'reminder', habitId: row.habit_id, crewId: row.habits.crew_id },
    });
    sends.push({
      user_id: row.user_id,
      kind: 'reminder',
      ref_id: row.habit_id,
      local_date: local.date,
    });
  }

  // --- held nudges ---
  type NudgeRow = {
    id: string;
    crew_id: string;
    from_user: string;
    to_user: string;
    message: string;
    local_date: string;
    crews: { name: string; habit_id: string };
  };

  const deliveredNudgeIds: string[] = [];
  for (const row of (nudges.data ?? []) as unknown as NudgeRow[]) {
    const profile = byProfile.get(row.to_user);
    if (!profile || !profile.push_token) continue;

    const local = localNow(profile.timezone, now);
    const schedule = ((schedules.data ?? []) as unknown as ScheduleRow[]).find(
      (item) => item.habit_id === row.crews.habit_id && item.user_id === row.to_user,
    );

    const decision = shouldDeliverNudge({
      mode: schedule?.mode ?? 'any',
      anchorTime: schedule?.anchors?.usual_time ?? null,
      atTime: schedule?.at_time ?? null,
      nowMinutes: local.minutes,
      checkedIn: done.has(doneKey(row.crews.habit_id, row.to_user, local.date)),
      alreadyDelivered: alreadySent.has(sentKey(row.to_user, 'nudge', row.id, row.local_date)),
      quietStart: profile.quiet_start,
      quietEnd: profile.quiet_end,
      pausedForMinutes: pausedUntil.get(row.to_user) ?? 0,
    });
    if (!decision.send) continue;

    const { data: crewMembers } = await supabase
      .from('crew_members')
      .select('user_id')
      .eq('crew_id', row.crew_id);
    const total = crewMembers?.length ?? 0;
    const inCount = (crewMembers ?? []).filter((member) =>
      done.has(doneKey(row.crews.habit_id, member.user_id, local.date)),
    ).length;

    const sender = byProfile.get(row.from_user)?.display_name ?? 'Someone';
    messages.push({
      to: profile.push_token,
      title: `${sender} nudged you`,
      body: nudgeBody(row.message, row.crews.name, inCount, total, total - inCount === 1),
      categoryId: 'habit',
      sound: 'default',
      data: { kind: 'nudge', nudgeId: row.id, habitId: row.crews.habit_id, crewId: row.crew_id },
    });
    sends.push({
      user_id: row.to_user,
      kind: 'nudge',
      ref_id: row.id,
      local_date: row.local_date,
    });
    deliveredNudgeIds.push(row.id);
  }

  // --- streak saved: the crew got through the day ---
  const { data: crews } = await supabase.from('crews').select('id, name, habit_id, streak_current');
  for (const crew of crews ?? []) {
    const { data: members } = await supabase
      .from('crew_members')
      .select('user_id')
      .eq('crew_id', crew.id);
    if (!members || members.length === 0) continue;

    const everyoneIn = members.every((member) => {
      const profile = byProfile.get(member.user_id);
      const date = profile ? localNow(profile.timezone, now).date : null;
      return date ? done.has(doneKey(crew.habit_id, member.user_id, date)) : false;
    });
    if (!everyoneIn) continue;

    for (const member of members) {
      const profile = byProfile.get(member.user_id);
      if (!profile?.push_token) continue;
      const local = localNow(profile.timezone, now);
      if (alreadySent.has(sentKey(member.user_id, 'streak_saved', crew.id, local.date))) continue;

      messages.push({
        to: profile.push_token,
        title: crew.name,
        body: `Streak saved · ${crew.streak_current + 1} days`,
        sound: 'default',
        data: { kind: 'streak_saved', crewId: crew.id },
      });
      sends.push({
        user_id: member.user_id,
        kind: 'streak_saved',
        ref_id: crew.id,
        local_date: local.date,
      });
    }
  }

  const count = await sendPush(messages);

  // Record the sends only once Expo has taken them.
  if (sends.length > 0) {
    await supabase.from('notification_sends').upsert(sends, {
      onConflict: 'user_id,kind,ref_id,local_date',
      ignoreDuplicates: true,
    });
  }
  if (deliveredNudgeIds.length > 0) {
    await supabase.from('nudges').update({ status: 'delivered' }).in('id', deliveredNudgeIds);
  }

  return Response.json({ ranAt: now.toISOString(), sent: count });
});
