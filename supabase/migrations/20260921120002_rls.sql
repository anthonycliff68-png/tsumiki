-- Row Level Security for every table.
--
-- Shape of the rules:
--   * you read and write your own rows;
--   * crew members can read their crew, its check-ins, nudges and statuses;
--   * crewmates' profiles are readable only as name + colour, through the
--     public.crew_profiles view — never the whole profiles row;
--   * streak fields (crews.streak_*, crew_members.grace_used) are written by
--     Edge Functions with the service role, never by the app.

-- Helpers run as definer so a policy on crew_members can query crew_members
-- without tripping over its own policy.
create or replace function public.is_crew_member(p_crew uuid, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.crew_members cm
    where cm.crew_id = p_crew and cm.user_id = p_user
  );
$$;

create or replace function public.is_crew_owner(p_crew uuid, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.crew_members cm
    where cm.crew_id = p_crew and cm.user_id = p_user and cm.role = 'owner'
  );
$$;

create or replace function public.shares_crew_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crew_members mine
    join public.crew_members theirs on theirs.crew_id = mine.crew_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user
  );
$$;

-- True when this habit belongs to a crew the caller is in.
create or replace function public.can_read_habit(p_habit uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.habits h
    where h.id = p_habit
      and (h.owner_id = auth.uid() or (h.crew_id is not null and public.is_crew_member(h.crew_id)))
  );
$$;

alter table public.profiles enable row level security;
alter table public.anchors enable row level security;
alter table public.habits enable row level security;
alter table public.habit_schedules enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.checkins enable row level security;
alter table public.nudges enable row level security;
alter table public.reactions enable row level security;
alter table public.invites enable row level security;
alter table public.status_events enable row level security;

-- profiles: your own row only. Crewmates see the view below instead.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Name and colour of the people you share a crew with, and nothing else.
create or replace view public.crew_profiles
with (security_invoker = off) as
  select p.id, p.display_name, p.avatar_color
  from public.profiles p
  where p.id = auth.uid() or public.shares_crew_with(p.id);

revoke all on public.crew_profiles from anon, authenticated;
grant select on public.crew_profiles to authenticated;

-- anchors: private to their owner.
create policy anchors_all_own on public.anchors
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- habits: the owner writes; crew members read.
create policy habits_select on public.habits
  for select to authenticated
  using (owner_id = auth.uid() or (crew_id is not null and public.is_crew_member(crew_id)));
create policy habits_insert_own on public.habits
  for insert to authenticated with check (owner_id = auth.uid());
create policy habits_update_own on public.habits
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy habits_delete_own on public.habits
  for delete to authenticated using (owner_id = auth.uid());

-- habit_schedules: you write your own moment; crewmates can see theirs.
create policy habit_schedules_select on public.habit_schedules
  for select to authenticated
  using (user_id = auth.uid() or public.can_read_habit(habit_id));
create policy habit_schedules_insert_own on public.habit_schedules
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_read_habit(habit_id));
create policy habit_schedules_update_own on public.habit_schedules
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy habit_schedules_delete_own on public.habit_schedules
  for delete to authenticated using (user_id = auth.uid());

-- crews: members read. Only the name is writable by the app (see grants below).
create policy crews_select_member on public.crews
  for select to authenticated using (public.is_crew_member(id));
create policy crews_insert_own on public.crews
  for insert to authenticated with check (created_by = auth.uid());
create policy crews_update_member on public.crews
  for update to authenticated using (public.is_crew_member(id)) with check (public.is_crew_member(id));
create policy crews_delete_owner on public.crews
  for delete to authenticated using (public.is_crew_owner(id));

revoke update on public.crews from authenticated;
grant update (name) on public.crews to authenticated;

-- crew_members: you can see your crews' members, add yourself to a crew you
-- created, and leave. Everyone else joins through the invite Edge Function,
-- which runs as the service role.
create policy crew_members_select on public.crew_members
  for select to authenticated using (public.is_crew_member(crew_id));
create policy crew_members_insert_self on public.crew_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.crews c where c.id = crew_id and c.created_by = auth.uid())
  );
create policy crew_members_delete_self on public.crew_members
  for delete to authenticated using (user_id = auth.uid());

revoke update on public.crew_members from authenticated;

-- checkins: yours to write, your crew's to read.
create policy checkins_select on public.checkins
  for select to authenticated
  using (user_id = auth.uid() or public.can_read_habit(habit_id));
create policy checkins_insert_own on public.checkins
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_read_habit(habit_id));
create policy checkins_delete_own on public.checkins
  for delete to authenticated using (user_id = auth.uid());

revoke update on public.checkins from authenticated;

-- nudges: one per sender → recipient per local day, and only while the
-- recipient still has the habit open. Status moves are the Edge Function's.
create policy nudges_select_crew on public.nudges
  for select to authenticated using (public.is_crew_member(crew_id));
create policy nudges_insert on public.nudges
  for insert to authenticated
  with check (
    from_user = auth.uid()
    and public.is_crew_member(crew_id)
    and public.is_crew_member(crew_id, to_user)
    and not exists (
      select 1
      from public.checkins c
      join public.crews cr on cr.id = nudges.crew_id
      where c.habit_id = cr.habit_id
        and c.user_id = nudges.to_user
        and c.local_date = nudges.local_date
    )
  );

revoke update on public.nudges from authenticated;

-- reactions: the person who was nudged thanks the sender.
create policy reactions_select_crew on public.reactions
  for select to authenticated
  using (exists (
    select 1 from public.nudges n
    where n.id = nudge_id and public.is_crew_member(n.crew_id)
  ));
create policy reactions_insert_recipient on public.reactions
  for insert to authenticated
  with check (
    from_user = auth.uid()
    and exists (select 1 from public.nudges n where n.id = nudge_id and n.to_user = auth.uid())
  );

-- invites: crew members create and read them. The public landing page reads a
-- separate view, added with the invite flow in build step 8.
create policy invites_select_crew on public.invites
  for select to authenticated using (public.is_crew_member(crew_id));
create policy invites_insert_member on public.invites
  for insert to authenticated
  with check (created_by = auth.uid() and public.is_crew_member(crew_id));
create policy invites_delete on public.invites
  for delete to authenticated
  using (created_by = auth.uid() or public.is_crew_owner(crew_id));

revoke update on public.invites from authenticated;

-- status_events: "on the way", visible to the crew.
create policy status_events_select_crew on public.status_events
  for select to authenticated using (public.is_crew_member(crew_id));
create policy status_events_insert_own on public.status_events
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_crew_member(crew_id));
create policy status_events_delete_own on public.status_events
  for delete to authenticated using (user_id = auth.uid());

revoke update on public.status_events from authenticated;

-- Nothing in here is readable without signing in.
revoke all on public.profiles, public.anchors, public.habits, public.habit_schedules,
  public.crews, public.crew_members, public.checkins, public.nudges, public.reactions,
  public.invites, public.status_events from anon;
