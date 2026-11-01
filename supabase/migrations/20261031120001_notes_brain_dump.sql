-- Notes, and the brain dumps that can write them.
--
-- Notes are free for everyone: folders read by day, no tags. The brain dump is
-- Pro, and sorts what someone said into to-dos, notes and habit ideas; the
-- brain-dump Edge Function keeps each transcript here so a failed sort never
-- loses it, and "Your words" on a note can show exactly what was said.
--
-- Nothing in habits, crews, checkins or the streak job references these.

create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  emoji text,
  color text not null,
  created_at timestamptz not null default now()
);

-- "Roundnet" and "roundnet" are the same folder, so the AI can't make a twin.
create unique index if not exists note_folders_user_name on public.note_folders (user_id, lower(name));

-- Written by the brain-dump function with the service role, never by the app.
create table if not exists public.brain_dumps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transcript text not null,
  created_at timestamptz not null default now()
);

-- The daily cap counts these.
create index if not exists brain_dumps_user_created on public.brain_dumps (user_id, created_at);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Null is Inbox. Deleting a folder drops its notes back there.
  folder_id uuid references public.note_folders(id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null default '',
  dump_id uuid references public.brain_dumps(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notes_user_created on public.notes (user_id, created_at desc);

alter table public.note_folders enable row level security;
alter table public.notes enable row level security;
alter table public.brain_dumps enable row level security;

-- Yours and nobody else's. Notes are never shared.
drop policy if exists note_folders_own on public.note_folders;
create policy note_folders_own on public.note_folders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists notes_own on public.notes;
create policy notes_own on public.notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Read your own; only the function inserts.
drop policy if exists brain_dumps_read_own on public.brain_dumps;
create policy brain_dumps_read_own on public.brain_dumps
  for select
  using (auth.uid() = user_id);

-- When they agreed to their words going to Anthropic to be sorted. The
-- function refuses to sort until this is set (App Review 5.1.2(i)).
alter table public.profiles add column if not exists ai_consent_at timestamptz;
