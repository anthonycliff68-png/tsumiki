-- Permission to email somebody about the app, recorded rather than assumed.
--
-- Until now an address existed for one reason: signing in. Using it to send
-- product news is a different purpose, and a different purpose needs asking.
-- Off by default, and off is a real answer — nothing here is pre-ticked.
--
-- The address itself stays in auth.users and is not copied here. Two columns
-- holding the same email drift apart the first time somebody changes theirs,
-- and then there is no way to tell which one is the person's actual inbox.
-- The sender reads it from auth.users with the service role at send time.

alter table public.profiles
  add column if not exists product_email_opt_in boolean not null default false,
  -- When they last said so. This is the part that matters if anyone ever
  -- disputes being on the list: "they opted in" is worth nothing without a
  -- date attached to it.
  add column if not exists product_email_decided_at timestamptz,
  -- Lets the unsubscribe link in an email work without signing in. Anyone who
  -- can be bothered to click unsubscribe should not then be asked to remember
  -- a password; that is how a complaint becomes a spam report.
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsubscribe_token
  on public.profiles (unsubscribe_token);

-- Stamp the date whenever the answer changes, so the record cannot be set
-- without one. Doing it here rather than in the app means it is also true for
-- rows the app never touched.
create or replace function public.stamp_product_email_decision()
returns trigger
language plpgsql
as $$
begin
  if new.product_email_opt_in is distinct from old.product_email_opt_in then
    new.product_email_decided_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_stamp_email_decision on public.profiles;
create trigger profiles_stamp_email_decision
  before update on public.profiles
  for each row
  execute function public.stamp_product_email_decision();

comment on column public.profiles.product_email_opt_in is
  'Whether this person agreed to product email. Off unless they said otherwise. Login email is not covered by this and is always sent.';
