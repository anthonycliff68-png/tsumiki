-- To-dos: the things that are not habits.
--
-- A habit is due, counts towards a streak, and can be shared with a crew.
-- None of that is true here. A to-do is something you wrote down once and
-- either did or did not do, and missing it costs nothing. Keeping the two
-- apart is the whole design: the moment a to-do can break a streak, people
-- stop writing them down.
--
-- So this table stands alone. Nothing in habits, crews, checkins or the
-- nightly streak job references it or ever should, which is also what makes
-- the experiment cheap to end — a `drop table` and the app is exactly as it
-- was.
--
-- Two columns do all the work: the title and the day it belongs to.
-- Everything a to-do might later gain — a moment, notes, whether it repeats —
-- is deliberately absent. The rule is that a title is the only thing anyone
-- has to type, because a planner that interrogates you at the moment you are
-- trying to get something out of your head is a planner you stop opening.
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  -- The day it was written for, in the writer's own local date. This never
  -- moves. Carrying over is a question the *query* answers, not a nightly job
  -- that rewrites rows: an unfinished to-do shows on every day from its own
  -- until the day it is done. That keeps "added Tuesday, still not done" a
  -- fact the row already knows, rather than something a job has to remember.
  day date not null,
  -- The local date it was finished on, or null while it is still to do.
  --
  -- A date and not a timestamp, for the same reason checkins.local_date is a
  -- date: every question the app asks is "was this done on this person's
  -- Tuesday", and a timestamptz turns that into timezone arithmetic on the
  -- server for no gain. It is also what lets a to-do written on Tuesday and
  -- finished on Thursday show greyed in place on Thursday — one indexable
  -- comparison rather than a window over done_at.
  done_on date,
  created_at timestamptz not null default now()
);

comment on column public.todos.day is
  'The local date this to-do was written for. Never moved by the app: an unfinished to-do carries forward by being queried for every date on or after this one, so the original day stays readable as "carried over since".';

-- The only query the app makes: this person's unfinished to-dos up to today.
-- Partial on done_on because a finished to-do is read once, in the recap, and
-- never again — there is no reason to carry it in the index the day screen
-- hits on every load.
create index if not exists todos_user_day on public.todos (user_id, day)
  where done_on is null;

alter table public.todos enable row level security;

-- Yours and nobody else's. Unlike habits there is no crew path in here at
-- all: a to-do is never shared, so there is no second policy and no view that
-- exposes one person's list to another.
create policy todos_own on public.todos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
