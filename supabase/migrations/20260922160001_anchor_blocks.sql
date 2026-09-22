-- A moment in the day can now last: "Work, 9:00 to 17:30" rather than just a
-- point at 9:00. Habits still stack onto it — a block absorbs them, it does not
-- fence them out — but the gaps between blocks are now exact rather than
-- guessed from the distance between two points.
--
-- Null ends_at keeps the old meaning: a moment with no duration.
alter table public.anchors add column ends_at time;

alter table public.anchors
  add constraint anchors_block_ends_after_it_starts
  check (ends_at is null or ends_at > usual_time);

comment on column public.anchors.usual_time is 'When the moment starts. Rough is fine.';
comment on column public.anchors.ends_at is
  'When it ends, for a block like a work day. Null for a moment with no duration.';
