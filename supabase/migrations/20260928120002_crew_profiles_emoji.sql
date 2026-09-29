-- The emoji has to travel with the name.
--
-- crew_profiles is the only way one member sees another, so a column missing
-- from it is a column that only ever shows to its owner. Replaced rather than
-- altered: a view's column list cannot be added to in place.
create or replace view public.crew_profiles
with (security_invoker = off) as
  select p.id, p.display_name, p.avatar_color, p.avatar_emoji
  from public.profiles p
  where p.id = auth.uid() or public.shares_crew_with(p.id);

revoke all on public.crew_profiles from anon, authenticated;
grant select on public.crew_profiles to authenticated;
