-- The streak job needs to know who is locked out, and it could not.
--
-- entitlement.ts has always said that a locked member stops counting as *due*,
-- so one lapsed trial cannot reset a streak the other four are keeping alive.
-- That rule lived in countsAsDue(), which nothing ever called: whether someone
-- has paid comes from RevenueCat, and the nightly job talks to Postgres.
--
-- It did not matter while the app was free, because nobody was ever locked.
-- The paywall is what makes it matter.
--
-- So the client writes the entitlement's expiry here whenever it hears from
-- RevenueCat. An expiry rather than a boolean on purpose: it keeps being true
-- as it passes, so somebody whose subscription lapses becomes locked on its
-- own, without needing to open the app for the server to find out.
alter table public.profiles
  add column if not exists subscribed_until timestamptz;

comment on column public.profiles.subscribed_until is
  'When the RevenueCat entitlement runs out. Null means never subscribed. Written by the client; the streak job reads it to decide who still owes the crew a day.';
