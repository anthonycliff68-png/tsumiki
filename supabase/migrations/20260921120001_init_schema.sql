-- Tsumiki core schema.
-- Dates are always the member's LOCAL date (profiles.timezone); the app sends them.
-- days_of_week uses 0 = Sunday … 6 = Saturday, matching JavaScript's getDay().

create extension if not exists pgcrypto;

create type public.schedule_mode as enum ('after', 'at', 'any');
create type public.crew_role as enum ('owner', 'member');
create type public.nudge_status as enum ('sent', 'delivered', 'acted');
create type public.reaction_kind as enum ('thanks', 'same_time_tmrw');
create type public.status_kind as enum ('heading_out');

-- One row per signed-in person. Created by a trigger on auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_color text not null default '#3F5FA8',
  timezone text not null default 'UTC',
  push_token text,
  quiet_start time not null default '22:00',
  quiet_end time not null default '07:00',
  created_at timestamptz not null default now()
);

-- The fixed points of someone's day: wake up, coffee, lunch, bed.
create table public.anchors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  usual_time time not null,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint anchors_label_length check (char_length(label) between 1 and 40)
);

create index anchors_user_idx on public.anchors (user_id, sort_order);

-- habits.crew_id and crews.habit_id point at each other; the habit row is
-- written first, then the crew, then the habit is pointed back at the crew.
create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  habit_id uuid not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  streak_current integer not null default 0,
  streak_best integer not null default 0,
  streak_updated_on date,
  constraint crews_name_length check (char_length(name) between 1 and 40),
  constraint crews_streaks_non_negative check (streak_current >= 0 and streak_best >= 0)
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  color text not null,
  crew_id uuid references public.crews (id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint habits_name_length check (char_length(name) between 1 and 40),
  constraint habits_color_format check (color ~ '^#[0-9A-Fa-f]{6}$')
);

alter table public.crews
  add constraint crews_habit_id_fkey
  foreign key (habit_id) references public.habits (id) on delete cascade
  deferrable initially deferred;

create index habits_owner_idx on public.habits (owner_id) where archived_at is null;
create index habits_crew_idx on public.habits (crew_id);
create index crews_habit_idx on public.crews (habit_id);

-- One row per member per habit: everyone in a crew picks their own moment.
create table public.habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode public.schedule_mode not null,
  anchor_id uuid references public.anchors (id) on delete set null,
  at_time time,
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}',
  created_at timestamptz not null default now(),
  unique (habit_id, user_id),
  constraint habit_schedules_mode_shape check (
    (mode = 'after' and anchor_id is not null and at_time is null)
    or (mode = 'at' and at_time is not null and anchor_id is null)
    or (mode = 'any' and anchor_id is null and at_time is null)
  ),
  constraint habit_schedules_days_valid check (
    days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    and array_length(days_of_week, 1) between 1 and 7
  )
);

create index habit_schedules_user_idx on public.habit_schedules (user_id);

create table public.crew_members (
  crew_id uuid not null references public.crews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  role public.crew_role not null default 'member',
  grace_used boolean not null default false,
  primary key (crew_id, user_id)
);

create index crew_members_user_idx on public.crew_members (user_id);

-- A crew holds at most five people. Enforced here, not only in the join function.
create or replace function public.enforce_crew_size()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_count integer;
begin
  select count(*) into member_count from public.crew_members where crew_id = new.crew_id;
  if member_count >= 5 then
    raise exception 'crew_full' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger crew_members_max_size
before insert on public.crew_members
for each row execute function public.enforce_crew_size();

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, user_id, local_date)
);

create index checkins_user_date_idx on public.checkins (user_id, local_date);
create index checkins_habit_date_idx on public.checkins (habit_id, local_date);

create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  local_date date not null,
  created_at timestamptz not null default now(),
  status public.nudge_status not null default 'sent',
  unique (from_user, to_user, local_date),
  constraint nudges_message_length check (char_length(message) between 1 and 60),
  constraint nudges_not_self check (from_user <> to_user)
);

create index nudges_to_user_idx on public.nudges (to_user, local_date);
create index nudges_crew_idx on public.nudges (crew_id, local_date);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  nudge_id uuid not null references public.nudges (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  kind public.reaction_kind not null,
  created_at timestamptz not null default now(),
  unique (nudge_id, from_user, kind)
);

create table public.invites (
  code text primary key,
  crew_id uuid not null references public.crews (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  uses integer not null default 0,
  constraint invites_code_format check (code ~ '^[a-z0-9]{6,12}$')
);

create index invites_crew_idx on public.invites (crew_id);

-- "Heading out now": visible to the crew for 30 minutes, and it pauses
-- reminders and nudges to that member for the same window.
create table public.status_events (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.status_kind not null default 'heading_out',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create index status_events_crew_idx on public.status_events (crew_id, expires_at);

-- Every new auth user gets a profile, with a colour from the habit palette.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_color)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Friend'
    ),
    (array['#3F5FA8', '#E8552B', '#1F8A8C', '#8A5A9E', '#E0A526', '#C2306B'])[floor(random() * 6)::int + 1]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
