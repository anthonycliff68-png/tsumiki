-- The person who started a crew can look after it.
--
-- Until now a crew could not be changed at all once it existed: any member
-- could technically rename it (the policy allowed it, nothing in the app
-- did), and nobody could remove anybody. Both are wrong in different
-- directions.
--
-- Renaming narrows to the creator. A shared name that any of five people can
-- change is an afternoon nobody wanted, and the creator is the one who
-- answers for the crew existing.

drop policy if exists crews_update_member on public.crews;

create policy crews_update_owner on public.crews
  for update to authenticated
  using (public.is_crew_owner(id))
  with check (public.is_crew_owner(id));

-- The creator can remove someone. They cannot remove themselves this way:
-- leaving is a different act with different consequences for the streak, and
-- it already has its own policy.
--
-- Note the gap this leaves on purpose: if the creator leaves, created_by
-- still points at them and nobody can manage the crew. Handing the crew on
-- when its owner goes is a larger question than this migration, and guessing
-- at it here would be worse than leaving it visible.

create policy crew_members_delete_by_owner on public.crew_members
  for delete to authenticated
  using (
    user_id <> auth.uid()
    and exists (
      select 1 from public.crews c
      where c.id = crew_id and c.created_by = auth.uid()
    )
  );
