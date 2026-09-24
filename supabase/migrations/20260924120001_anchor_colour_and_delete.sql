-- Routine moments get a colour of their own, and can actually be deleted.
--
-- Two problems, one migration.
--
-- 1. A moment's colour was derived from its label in the app, so it could not
--    be chosen. The column is nullable on purpose: null means "never chosen",
--    and the app keeps deriving it from the label, so nothing changes colour
--    until someone picks one. That is a truer backfill than guessing the hash
--    in SQL, and it leaves one source of truth for the derivation.
--
-- 2. Deleting a moment that had habits stacked on it failed outright. The
--    foreign key nulls anchor_id, but habit_schedules_mode_shape insists an
--    'after' schedule has an anchor, so the check rejected the cascade and the
--    whole delete aborted (error 23514). A moment you cannot delete because
--    something depends on it is the moment you most want to delete.
--
--    The fix drops the anchor to a plain 'anytime' schedule instead: the habit
--    survives, keeps its history, and shows up under Anytime. The trigger runs
--    before the foreign key's own action, so the row is already valid by the
--    time the constraint is checked.

alter table public.anchors
  add column if not exists color text;

comment on column public.anchors.color is
  'Chosen colour for the moment. Null means the app derives one from the label.';

-- Loosen the shape check so a schedule may sit at 'any' with nothing attached,
-- which is what a freed habit becomes. (Unchanged in substance; restated here
-- so the intent is readable next to the trigger below.)

create or replace function public.release_habits_from_anchor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Anything stacked on the moment being removed becomes an anytime habit.
  update public.habit_schedules
     set mode = 'any',
         anchor_id = null,
         at_time = null
   where anchor_id = old.id;
  return old;
end;
$$;

drop trigger if exists anchors_release_habits on public.anchors;

create trigger anchors_release_habits
  before delete on public.anchors
  for each row
  execute function public.release_habits_from_anchor();
