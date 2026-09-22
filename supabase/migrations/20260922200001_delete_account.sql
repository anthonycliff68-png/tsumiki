-- Deleting your account, which the App Store requires of any app that lets you
-- make one.
--
-- Everything hangs off auth.users by cascade, so removing that row removes the
-- profile, anchors, habits, schedules, check-ins, nudges and reactions with it.
-- Two things need care first:
--
--  * crews.created_by cascaded, so deleting the person who started a crew took
--    the crew away from everyone still in it. It is nullable and SET NULL now;
--    a crew outlives whoever made it.
--  * membership is removed through the same path as leaving, so a crew whose
--    last member deletes their account is cleaned up rather than left empty.
--
-- A crew's habit still belongs to the person who created it, and habits cascade
-- to crews, so deleting that person does end that crew for everyone. The app
-- says so before it asks you to confirm.

alter table public.crews alter column created_by drop not null;

alter table public.crews drop constraint crews_created_by_fkey;
alter table public.crews
  add constraint crews_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_crew record;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  -- Leave every crew first, so an empty one is tidied away instead of lingering.
  for v_crew in select crew_id from public.crew_members where user_id = v_user loop
    perform public.leave_crew(v_crew.crew_id);
  end loop;

  -- The cascade from auth.users does the rest.
  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
