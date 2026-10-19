-- Where a to-do sits in the day.
--
-- The first cut had a to-do belong to a date and nothing else, which was the
-- right place to start and the wrong place to stop: everything with no moment
-- piled up in one list at the bottom of the day, and the schedule above it
-- had no idea any of it existed.
--
-- These are the same three modes a habit already has, named the same way, on
-- purpose. There is one idea of "when" in this app — after a moment, at a
-- time, or any time today — and a second vocabulary for to-dos would mean two
-- things to learn and two code paths deciding where a row is drawn.
--
-- All three columns are optional and default to the loosest answer, because
-- the rule that makes capture cheap has not changed: a title is still the
-- only thing anyone has to type. A to-do that is never placed stays in the
-- list, which is a fine place for it to live forever.
alter table public.todos
  add column if not exists moment_mode text not null default 'any'
    check (moment_mode in ('after', 'at', 'any')),
  -- Set null rather than cascade: deleting a moment must not delete the
  -- things somebody hung off it. They fall back to the list, which is exactly
  -- what placementOf already does for a habit whose anchor is gone.
  add column if not exists anchor_id uuid references public.anchors(id) on delete set null,
  add column if not exists at_time time;

comment on column public.todos.moment_mode is
  'after | at | any — the same three modes as habit_schedules.mode, deliberately. A to-do with no moment is "any" and lives in the list rather than on the hour grid.';

-- The day screen asks for the unfinished ones and then groups them by moment
-- in the client, so this stays the index that matters. Adding anchor_id to it
-- would serve a query nothing makes.
