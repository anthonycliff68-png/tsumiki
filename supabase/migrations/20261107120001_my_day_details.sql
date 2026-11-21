-- My Day, Release 2: the details the new edit sheet saves.
--
-- Every column is nullable, and null means "as before": an older copy of the
-- app that never sends them keeps working, and nothing in the streak job reads
-- them.

-- A to-do's own colour. Null = the colour picked from its id, as Release 1
-- shows it today.
alter table public.todos
  add column if not exists color text
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');

-- One quick note per item.
alter table public.todos
  add column if not exists note text
  check (note is null or char_length(note) <= 1000);

-- The emoji in front of the title. Null = guessed from the title, '' = none.
alter table public.todos
  add column if not exists emoji text
  check (emoji is null or char_length(emoji) <= 16);

-- On the schedule, not the habit: a crew shares one habits row, but a note and
-- an emoji are personal. Crewmates can read them through can_read_habit like
-- the rest of the schedule; the app never shows them.
alter table public.habit_schedules
  add column if not exists note text
  check (note is null or char_length(note) <= 1000);

alter table public.habit_schedules
  add column if not exists emoji text
  check (emoji is null or char_length(emoji) <= 16);

-- Moments are already one person's, so theirs goes on the row. Null = guessed
-- from the name, '' = none.
alter table public.anchors
  add column if not exists emoji text
  check (emoji is null or char_length(emoji) <= 16);

-- A to-do's steps, in order. Finished steps stay in place; the first open one
-- is "up next". Checking the last one finishes the to-do (done in the app).
create table if not exists public.todo_steps (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  position integer not null,
  -- The local date it was checked on, or null while it is open.
  done_on date,
  created_at timestamptz not null default now()
);

create index if not exists todo_steps_todo_position on public.todo_steps (todo_id, position);

alter table public.todo_steps enable row level security;

-- Yours, on your own to-dos only.
drop policy if exists todo_steps_own on public.todo_steps;
create policy todo_steps_own on public.todo_steps
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.todos t where t.id = todo_id and t.user_id = auth.uid())
  );
