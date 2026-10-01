-- Let crewmates read the label of an anchor a shared habit hangs on.
--
-- The crew screen is built to show each member's own moment — "Same habit,
-- everyone's own anchor" is written above the tiles. It could not. A member
-- could read a crewmate's habit_schedules row, so it knew the moment was an
-- anchored one, but anchors were readable only by their owner, so the label
-- never resolved and the tile fell back to "Anytime today".
--
-- That is worse than showing nothing: every anchored crewmate was described as
-- doing their habit at no particular time, which is the one thing the app
-- exists to argue against. Found the first time two accounts shared a crew.
--
-- Narrow on purpose. It exposes an anchor only when that anchor is the moment
-- the reader's own shared habit hangs on, so a crewmate sees "Lunch" for the
-- habit you do together and nothing about the rest of your day.
create policy anchors_select_crew on public.anchors
  for select to authenticated
  using (
    exists (
      select 1
      from public.habit_schedules hs
      where hs.anchor_id = anchors.id
        and hs.user_id = anchors.user_id
        and public.can_read_habit(hs.habit_id)
    )
  );
