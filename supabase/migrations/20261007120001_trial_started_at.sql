-- When somebody's free days actually begin.
--
-- The trial has always counted from profiles.created_at, which was fine while
-- there was no paywall: the two dates were the same thing. Shipping 1.1 pulls
-- them apart. Somebody who downloads the free 1.0 today, then updates a
-- fortnight later, has an account older than the trial — so the paywall would
-- meet them on first launch having never given them a single free day. They
-- downloaded a free app; that is not a reasonable thing to do to them.
--
-- So the clock starts when the app first tells them there is one, not when
-- they signed up. Null means it has not started: decideAccess falls back to
-- created_at, which is right for anyone who arrives after 1.1 is out, and the
-- client stamps it on first launch for everyone who was already here.
alter table public.profiles
  add column if not exists trial_started_at timestamptz;

comment on column public.profiles.trial_started_at is
  'When the free days began — stamped by the client the first time 1.1 runs. Null falls back to created_at. Separate from created_at so that updating to the paid version is not the same as having used it.';
