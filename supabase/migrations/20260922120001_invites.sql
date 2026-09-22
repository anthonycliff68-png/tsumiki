-- Invites: a short code that lets one more person into a crew.
--
-- The person joining cannot read the crew yet — RLS only opens up once they
-- are a member — so both of these run as definer and do their own checking.

/** A short, unambiguous code. No vowels, so it cannot spell anything. */
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := '23456789bcdfghjkmnpqrstvwxyz';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.create_invite(p_crew_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_code text;
  v_attempts integer := 0;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  if not public.is_crew_member(p_crew_id, v_user) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  if (select count(*) from public.crew_members where crew_id = p_crew_id) >= 5 then
    raise exception 'crew_full' using errcode = '23514';
  end if;

  -- Reuse a live invite rather than piling up codes for the same crew.
  select code into v_code
  from public.invites
  where crew_id = p_crew_id and expires_at > now()
  order by created_at desc
  limit 1;

  if v_code is not null then
    return v_code;
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_code := public.generate_invite_code();
    exit when not exists (select 1 from public.invites where code = v_code);
    if v_attempts > 20 then
      raise exception 'could_not_generate_code';
    end if;
  end loop;

  insert into public.invites (code, crew_id, created_by) values (v_code, p_crew_id, v_user);
  return v_code;
end;
$$;

revoke all on function public.create_invite(uuid) from public, anon;
grant execute on function public.create_invite(uuid) to authenticated;

/**
 * What the invite link shows before anyone signs in: enough to decide, and
 * nothing more. A function rather than a view, so the code has to be known —
 * a view would let anyone with the anon key list every crew.
 */
create or replace function public.get_invite(p_code text)
returns table (
  code text,
  crew_name text,
  habit_name text,
  habit_color text,
  streak_current integer,
  member_count integer,
  is_full boolean,
  expired boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.code,
    c.name,
    h.name,
    h.color,
    c.streak_current,
    (select count(*)::int from public.crew_members cm where cm.crew_id = c.id),
    (select count(*) from public.crew_members cm where cm.crew_id = c.id) >= 5,
    i.expires_at <= now()
  from public.invites i
  join public.crews c on c.id = i.crew_id
  join public.habits h on h.id = c.habit_id
  where i.code = lower(trim(p_code));
$$;

revoke all on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;

/**
 * Join, picking your own moment for the crew's habit. One transaction: the
 * membership, your schedule and the invite's use count move together.
 */
create or replace function public.join_crew(
  p_code text,
  p_mode public.schedule_mode,
  p_anchor_id uuid default null,
  p_at_time time default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_crew_id uuid;
  v_habit_id uuid;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select i.crew_id, c.habit_id into v_crew_id, v_habit_id
  from public.invites i
  join public.crews c on c.id = i.crew_id
  where i.code = lower(trim(p_code)) and i.expires_at > now();

  if v_crew_id is null then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.crew_members where crew_id = v_crew_id and user_id = v_user) then
    return v_crew_id;
  end if;

  -- The five-person limit is also a trigger on crew_members; checked here too
  -- so the caller gets a clear error rather than a constraint violation.
  if (select count(*) from public.crew_members where crew_id = v_crew_id) >= 5 then
    raise exception 'crew_full' using errcode = '23514';
  end if;

  if p_mode = 'after' and p_anchor_id is null then
    raise exception 'anchor_required' using errcode = '23514';
  end if;
  if p_mode = 'at' and p_at_time is null then
    raise exception 'time_required' using errcode = '23514';
  end if;

  -- The anchor has to be one of yours.
  if p_anchor_id is not null and not exists (
    select 1 from public.anchors a where a.id = p_anchor_id and a.user_id = v_user
  ) then
    raise exception 'anchor_not_yours' using errcode = '42501';
  end if;

  insert into public.crew_members (crew_id, user_id, role) values (v_crew_id, v_user, 'member');

  insert into public.habit_schedules (habit_id, user_id, mode, anchor_id, at_time)
  values (
    v_habit_id,
    v_user,
    p_mode,
    case when p_mode = 'after' then p_anchor_id end,
    case when p_mode = 'at' then p_at_time end
  )
  on conflict (habit_id, user_id) do update
    set mode = excluded.mode, anchor_id = excluded.anchor_id, at_time = excluded.at_time;

  update public.invites set uses = uses + 1 where code = lower(trim(p_code));

  return v_crew_id;
end;
$$;

revoke all on function public.join_crew(text, public.schedule_mode, uuid, time) from public, anon;
grant execute on function public.join_crew(text, public.schedule_mode, uuid, time) to authenticated;
