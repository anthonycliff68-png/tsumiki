-- What has already been pushed, so nothing is sent twice.
-- Written only by the notify job, with the service role.
create table public.notification_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  /** The habit, nudge or crew the push was about. */
  ref_id uuid not null,
  local_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id, local_date),
  constraint notification_sends_kind check (kind in ('reminder', 'nudge', 'streak_saved'))
);

create index notification_sends_lookup on public.notification_sends (user_id, local_date);

alter table public.notification_sends enable row level security;
revoke all on public.notification_sends from anon, authenticated;

-- Push tokens are personal: you may write your own, and nobody reads them but
-- the job. profiles already restricts select to your own row.
comment on column public.profiles.push_token is
  'Expo push token. Written by the device, read only by the notify job.';
