-- Somewhere for people to tell us what is wrong.
--
-- A table rather than an email straight to the inbox, for three reasons. Email
-- is lossy: a sender that breaks drops feedback on the floor and nothing says
-- so. It is unsearchable six months later. And it depends on the custom SMTP
-- that is not set up yet, so a mailto-shaped design would mean no feedback at
-- all until it is.
--
-- The digest to the Gmail account sits on top of this and is allowed to fail.
-- What somebody took the trouble to write down is kept here either way.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null check (length(trim(message)) between 1 and 2000),
  -- Which build it came from. Not backfillable: a report that arrives without
  -- it is a report you cannot place, and by the time you notice, the version
  -- it was about has shipped twice over.
  app_version text,
  platform text,
  -- Whether they want to hear back. Asked rather than assumed, because a reply
  -- to someone who did not ask for one is a stranger emailing them about their
  -- habits.
  reply_wanted boolean not null default false,
  created_at timestamptz not null default now(),
  -- Set by the digest once it has gone out, so a resend cannot double-send and
  -- a failed run picks up exactly where it stopped.
  sent_at timestamptz
);

-- on delete set null above keeps the words when the account goes. Deleting an
-- account must not quietly delete the bug report that account filed, or the
-- only record of a problem leaves with the person most affected by it.
create index feedback_unsent on public.feedback (created_at) where sent_at is null;

alter table public.feedback enable row level security;

-- Write yours, read yours, change neither. There is no update or delete policy
-- on purpose: feedback that can be edited after the fact is not a record.
create policy feedback_insert_own on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid());

create policy feedback_select_own on public.feedback
  for select to authenticated
  using (user_id = auth.uid());

comment on table public.feedback is
  'What people write in the feedback form. The digest reads it with the service role; nobody reads anyone else''s.';
