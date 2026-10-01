-- Deleting a moment that has habits stacked on it.
--
-- It could not be done at all. anchors.id is referenced by habit_schedules
-- with "on delete set null", so removing a moment nulled the anchor on every
-- schedule pointing at it — and a schedule with mode 'after' and no anchor
-- fails the shape check, so Postgres refused the delete outright. The client
-- passed no onError, so the refusal was swallowed and the button simply did
-- nothing. It worked only for a moment nobody had stacked anything on, which
-- is the case nobody needs it for.
--
-- The confirmation has always promised the right behaviour — "N habits stacked
-- here. Deleting keeps them, moved to Anytime." — so that is what this does,
-- in one transaction with the delete rather than hoping a cascade will.
create or replace function public.delete_anchor(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  -- Checked explicitly rather than left to row-level security: a delete that
  -- silently matched nothing is how this went unnoticed in the first place.
  if not exists (
    select 1 from public.anchors a where a.id = p_id and a.user_id = v_user
  ) then
    raise exception 'anchor_not_yours' using errcode = '42501';
  end if;

  update public.habit_schedules
     set mode = 'any', anchor_id = null, at_time = null
   where anchor_id = p_id
     and user_id = v_user;

  delete from public.anchors where id = p_id and user_id = v_user;
end;
$$;

revoke all on function public.delete_anchor(uuid) from public, anon;
grant execute on function public.delete_anchor(uuid) to authenticated;
