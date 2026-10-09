-- Put the throwaway test account back, login and all, without an email.
--
-- reset-test-account.sh empties an account and keeps the login, which is the
-- cheap way to re-run onboarding. It stops working the moment the thing being
-- tested *is* account deletion: delete_my_account() deletes the auth.users row,
-- and the built-in email sender is rate limited to a couple an hour, so getting
-- the login back costs a sign-up code and a wait.
--
-- This recreates the row directly. Same uuid every time, so scripts/shots.env
-- stays correct and nothing else has to be told.
--
-- __USER__ and __EMAIL__ and __PASSWORD__ are substituted by the wrapper
-- script from scripts/shots.env, which is not in the repository.

-- gen_salt lives here on a Supabase project.
create extension if not exists pgcrypto with schema extensions;

delete from auth.users where id = '__USER__' or email = '__EMAIL__';

insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, last_sign_in_at,
  -- GoTrue reads these as strings, not as nulls. A NULL here makes password
  -- sign-in fail with "Database error querying schema", which costs an hour
  -- the first time and looks nothing like the actual cause.
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values (
  '__USER__', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '__EMAIL__',
  extensions.crypt('__PASSWORD__', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), now(),
  '', '', '', '', '', '', '', ''
);

-- Without a matching identity GoTrue finds the user and then refuses to
-- believe the password belongs to them.
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(), '__USER__', '__USER__', 'email',
  json_build_object('sub', '__USER__', 'email', '__EMAIL__', 'email_verified', true)::jsonb,
  now(), now(), now()
);

-- The profile row is normally made by a trigger on sign-up. Insert it if that
-- did not fire, and leave it blank either way so setup starts at step 1.
insert into public.profiles (id, display_name)
values ('__USER__', '')
on conflict (id) do update set display_name = '';

select
  (select count(*) from auth.users      where id = '__USER__') as auth_user,
  (select count(*) from auth.identities where user_id = '__USER__') as identity,
  (select count(*) from public.profiles where id = '__USER__') as profile;
