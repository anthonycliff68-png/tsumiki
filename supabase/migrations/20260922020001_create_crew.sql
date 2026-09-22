-- Turning a solo habit into a crew touches three tables: the crew, its first
-- member, and the habit that now points at it. One function so a failure
-- halfway through cannot leave a crew nobody belongs to.
create or replace function public.create_crew(p_habit_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_crew_id uuid;
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  -- Only your own habit, and only one crew per habit.
  if not exists (
    select 1 from public.habits h
    where h.id = p_habit_id and h.owner_id = v_owner and h.crew_id is null and h.archived_at is null
  ) then
    raise exception 'habit_not_available' using errcode = '42501';
  end if;

  if char_length(coalesce(trim(p_name), '')) = 0 then
    raise exception 'crew_needs_a_name' using errcode = '23514';
  end if;

  insert into public.crews (name, habit_id, created_by)
  values (trim(p_name), p_habit_id, v_owner)
  returning id into v_crew_id;

  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew_id, v_owner, 'owner');

  update public.habits set crew_id = v_crew_id where id = p_habit_id;

  return v_crew_id;
end;
$$;

revoke all on function public.create_crew(uuid, text) from public, anon;
grant execute on function public.create_crew(uuid, text) to authenticated;

-- Leaving is the mirror image: drop your membership, and if you were the last
-- one out, the crew goes with you and the habit becomes solo again.
create or replace function public.leave_crew(p_crew_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_remaining integer;
  v_habit uuid;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  delete from public.crew_members where crew_id = p_crew_id and user_id = v_user;

  select count(*) into v_remaining from public.crew_members where crew_id = p_crew_id;
  if v_remaining = 0 then
    select habit_id into v_habit from public.crews where id = p_crew_id;
    update public.habits set crew_id = null where id = v_habit;
    delete from public.crews where id = p_crew_id;
  end if;
end;
$$;

revoke all on function public.leave_crew(uuid) from public, anon;
grant execute on function public.leave_crew(uuid) to authenticated;
