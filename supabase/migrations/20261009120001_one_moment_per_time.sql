-- A moment cannot exist twice at the same time, and the database says so.
--
-- Six accounts carry duplicated moments: every one of them signed up on 1.0,
-- which went to the App Store on 28 September, two days before the screen
-- learned to refuse a second save. Caedon reported it as "each event pops up
-- twice" with a screenshot of Wake up, Gym, Coffee, Work starts and Lunch all
-- doubled, and he was looking at exactly that.
--
-- The guard in the app stops it happening again from this version on. It does
-- nothing for the people it already happened to, and nothing at all if another
-- route into that screen is ever added. A rule the database enforces holds for
-- every client, every version, and every mistake not yet made.
--
-- Deduplicating has to happen in the same breath, because Postgres will not
-- create the index while the duplicates are there.

-- Label *and* time. Not label alone: one of these accounts has "Brush teeth,
-- bed" at 22:00 and again at 22:30, which is somebody editing one copy rather
-- than the bug — a constraint on the label by itself would have made the
-- cleanup choose which of their two bedtimes to destroy. Exact copies are the
-- bug; a repeated name at a different time is a decision.

begin;

-- The oldest row of each exact group is the keeper, so anything hanging off a
-- doomed one is moved to it first. habit_schedules.anchor_id is the only
-- reference to an anchor, and a schedule left pointing at a deleted moment
-- would be a habit with no moment to hang from.
with ranked as (
  select
    id,
    first_value(id) over (
      partition by user_id, label, usual_time order by created_at, id
    ) as keeper
  from public.anchors
)
update public.habit_schedules s
   set anchor_id = r.keeper
  from ranked r
 where s.anchor_id = r.id
   and r.id <> r.keeper;

with ranked as (
  select
    id,
    first_value(id) over (
      partition by user_id, label, usual_time order by created_at, id
    ) as keeper
  from public.anchors
)
delete from public.anchors a
 using ranked r
 where a.id = r.id
   and r.id <> r.keeper;

create unique index anchors_one_per_moment
  on public.anchors (user_id, label, usual_time);

comment on index public.anchors_one_per_moment is
  'A moment cannot exist twice at the same time for one person. Added after six accounts from 1.0 ended up with every moment doubled; the same name at a different time is still allowed, because that is someone editing rather than the bug.';

commit;
