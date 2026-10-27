-- To-dos, back.
--
-- Dropped on 19 October because every layout tried then pushed the habits
-- down the day to make room. The redesign answers that differently: to-dos
-- live on Home as a short list, and on My Day they sit inside the hour they
-- belong to, under that hour's habits, so the day is still ordered by when.
--
-- Same table as 20261015120001 and 20261015130001 together, written as one
-- step so a fresh checkout reads it in one place. Still standalone: nothing in
-- habits, crews, checkins or the streak job references it, so a to-do can
-- never cost anyone a streak.
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  -- The local date it was written for. Never moved: an unfinished to-do
  -- carries forward by being queried for every later day until it is done.
  day date not null,
  -- The local date it was finished on, or null while it is still to do.
  done_on date,
  -- The same three modes as habit_schedules.mode: after a moment, at a time,
  -- or any time that day.
  moment_mode text not null default 'any' check (moment_mode in ('after', 'at', 'any')),
  -- Deleting a moment drops its to-dos back to "any" rather than deleting them.
  anchor_id uuid references public.anchors(id) on delete set null,
  at_time time,
  created_at timestamptz not null default now()
);

create index if not exists todos_user_day on public.todos (user_id, day);

alter table public.todos enable row level security;

-- Yours and nobody else's. A to-do is never shared.
drop policy if exists todos_own on public.todos;
create policy todos_own on public.todos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
