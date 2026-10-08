-- Who was in this crew, and when.
--
-- crew_members has been a statement about now: a row means you are in, no row
-- means you are not. That is fine until somebody can be removed, at which
-- point the nightly streak job can no longer answer the only question it
-- actually asks — who was due in this crew on 3 October — because the row it
-- needed is gone.
--
-- Worse, deleting the row makes the streak riggable. A member misses twice,
-- the owner removes them before the job runs, the reset never happens, and the
-- number on the crew screen is a lie. The streak is the one thing this app
-- asks anybody to believe.
--
-- So leaving is recorded rather than erased, and it takes effect tomorrow.
-- Today already happened and is not up for revision.
alter table public.crew_members
  add column if not exists left_on date;

comment on column public.crew_members.left_on is
  'The first date this member is no longer due. Null means still in the crew. Set to tomorrow in their own timezone, never to today — a membership change must not be able to rewrite a day that has already been judged.';

-- Due on a date means: joined on or before it, and not yet gone by it.
create or replace function public.crew_member_due_on(
  p_joined_at timestamptz,
  p_left_on date,
  p_date date
)
returns boolean
language sql
immutable
as $$
  select p_joined_at::date <= p_date
     and (p_left_on is null or p_date < p_left_on);
$$;

-- Removing somebody: the creator only, never themselves, and dated from
-- tomorrow in the timezone of whoever is being removed — their day is the one
-- the streak job judges them on.
create or replace function public.remove_crew_member(p_crew_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_zone text;
begin
  if v_me is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.crews c where c.id = p_crew_id and c.created_by = v_me
  ) then
    raise exception 'not_the_owner' using errcode = '42501';
  end if;

  -- Leaving your own crew is a different act with different consequences and
  -- it has its own path.
  if p_user_id = v_me then
    raise exception 'cannot_remove_yourself' using errcode = '42501';
  end if;

  select timezone into v_zone from public.profiles where id = p_user_id;

  update public.crew_members
     set left_on = ((now() at time zone coalesce(v_zone, 'UTC'))::date + 1)
   where crew_id = p_crew_id
     and user_id = p_user_id
     and left_on is null;
end;
$$;

revoke all on function public.remove_crew_member(uuid, uuid) from public, anon;
grant execute on function public.remove_crew_member(uuid, uuid) to authenticated;

-- A crew is full on the people actually in it, not on everyone who ever was.
create or replace function public.crew_not_full()
returns trigger
language plpgsql
as $$
declare
  member_count int;
begin
  select count(*) into member_count
    from public.crew_members
   where crew_id = new.crew_id and left_on is null;
  if member_count >= 5 then
    raise exception 'crew_full' using errcode = '23514';
  end if;
  return new;
end;
$$;
