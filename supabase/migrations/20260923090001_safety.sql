-- Blocking and reporting.
--
-- Nudges carry a message someone else wrote, and crews carry a name someone
-- else chose, which makes this an app with user-generated content between
-- users. The App Store asks such apps for a way to report content, a way to
-- block a person, and a commitment to act — without them, review refuses the
-- app under guideline 1.2.

create type public.report_kind as enum ('nudge', 'crew', 'profile');
create type public.report_status as enum ('open', 'reviewed', 'actioned');

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  /** Who is being reported. Kept even if the reporter leaves. */
  reported_id uuid references public.profiles (id) on delete set null,
  kind public.report_kind not null,
  /** The nudge or crew being reported, where there is one. */
  ref_id uuid,
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint reports_reason_length check (char_length(reason) between 1 and 500)
);

create index reports_open_idx on public.reports (status, created_at);

alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- You manage your own blocks and nobody else can see them.
create policy blocks_select_own on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy blocks_insert_own on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_delete_own on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- A report is write-only from the app: you can file one and see your own,
-- but only the service role reads the queue or changes a status.
create policy reports_insert_own on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_select_own on public.reports
  for select to authenticated using (reporter_id = auth.uid());

revoke update on public.reports from authenticated;
revoke all on public.blocks, public.reports from anon;

/** Has either person blocked the other? Blocking cuts both directions. */
create or replace function public.is_blocked(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

-- A blocked person cannot nudge you. Rebuilt rather than altered, since a
-- policy's condition cannot be changed in place.
drop policy nudges_insert on public.nudges;

create policy nudges_insert on public.nudges
  for insert to authenticated
  with check (
    from_user = auth.uid()
    and public.is_crew_member(crew_id)
    and public.is_crew_member(crew_id, to_user)
    and not public.is_blocked(from_user, to_user)
    and not exists (
      select 1
      from public.checkins c
      join public.crews cr on cr.id = nudges.crew_id
      where c.habit_id = cr.habit_id
        and c.user_id = nudges.to_user
        and c.local_date = nudges.local_date
    )
  );

-- And their nudges stop arriving, including any already sent.
drop policy nudges_select_crew on public.nudges;

create policy nudges_select_crew on public.nudges
  for select to authenticated
  using (public.is_crew_member(crew_id) and not public.is_blocked(from_user, to_user));
