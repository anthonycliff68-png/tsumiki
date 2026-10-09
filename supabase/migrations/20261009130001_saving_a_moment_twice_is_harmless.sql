-- Saving the same moment twice does nothing, instead of failing.
--
-- Written in a hurry and for a good reason. An hour ago this database learned
-- to refuse a duplicate moment, which stopped the bug that had given six
-- accounts a doubled day. It also turned that bug into something worse for the
-- version people are actually running: the setup screen inserts the whole
-- routine on "Looks right", and going forward a step and back leaves it
-- mounted, so the guard never re-runs and a second tap fires a second insert.
--
-- Before the index that quietly made duplicates. After it, the insert fails,
-- the screen shows "Could not save your routine. Try again.", and it fails
-- again every time — somebody could sit on step 2 with no way forward.
--
-- The app now upserts instead, which is the proper fix, and it is in a build
-- nobody has. 1.1 shipped before over-the-air updates existed, so the only
-- place a fix can reach today's users is here.
--
-- A moment that already exists is simply not inserted again. The row the
-- caller wanted is already there, which is what they were asking for.

create or replace function public.skip_duplicate_anchor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.anchors
     where user_id = new.user_id
       and label = new.label
       and usual_time = new.usual_time
  ) then
    -- Returning null from a BEFORE trigger drops the row without an error.
    return null;
  end if;
  return new;
end;
$$;

create trigger anchors_skip_duplicates
  before insert on public.anchors
  for each row
  execute function public.skip_duplicate_anchor();

comment on function public.skip_duplicate_anchor() is
  'Drops an insert for a moment that already exists rather than raising. The unique index still guarantees there is only ever one; this stops a client that asks twice from being told no, which on 1.1 left people unable to finish setting up.';
