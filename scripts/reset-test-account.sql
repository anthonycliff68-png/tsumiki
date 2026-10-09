-- Empty a test account back to the state a brand new one is in, without
-- deleting the login.
--
-- Deleting the account is the obvious way to re-run onboarding and the
-- expensive one: a new account needs a new sign-in code, and the email sender
-- is rate limited. This empties the rows that onboarding checks for and leaves
-- auth.users alone, so the same password sign-in keeps working, for ever, free.
--
-- Pair it with reinstalling the app on the simulator, which clears the device
-- flags. Together that is a genuinely fresh first run.
--
-- __USER__ is replaced with the account's uuid by reset-test-account.sh.
-- Nothing here touches anyone else's rows.

begin;

-- Crews first: a crew whose habit is about to go would be left pointing at
-- nothing, and leaving a crewmate alone in a crew they did not leave is worse
-- than removing it.
delete from public.crews
 where id in (select crew_id from public.crew_members where user_id = '__USER__');

delete from public.crew_members where user_id = '__USER__';
delete from public.checkins     where user_id = '__USER__';
delete from public.habit_schedules where user_id = '__USER__';
delete from public.habits       where owner_id = '__USER__';
delete from public.anchors      where user_id = '__USER__';

-- The profile row stays: it is created by a trigger on sign-up and the app
-- expects it to exist. Blanking the name sends you back through the step that
-- asks for one.
update public.profiles
   set display_name = '', trial_started_at = null, subscribed_until = null
 where id = '__USER__';

commit;

select
  (select count(*) from public.anchors  where user_id = '__USER__') as anchors,
  (select count(*) from public.habits   where owner_id = '__USER__') as habits,
  (select count(*) from public.checkins where user_id = '__USER__') as checkins;
