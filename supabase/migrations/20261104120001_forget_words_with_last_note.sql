-- Deleting a note forgets what was said to write it, once no other note from
-- that brain dump is left. Other notes from the dump still show "Your words"
-- until then.
--
-- The row stays with its transcript blanked: the daily cap counts these rows,
-- so deleting a note must not hand a dump back. A trigger, because the app
-- cannot write brain_dumps. It runs for account deletion too, which is harmless.

create or replace function public.forget_words_with_last_note()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.dump_id is not null
     and not exists (select 1 from public.notes where dump_id = old.dump_id) then
    update public.brain_dumps set transcript = '' where id = old.dump_id;
  end if;
  return null;
end;
$$;

revoke all on function public.forget_words_with_last_note() from public, anon, authenticated;

drop trigger if exists notes_forget_words on public.notes;
create trigger notes_forget_words
  after delete on public.notes
  for each row execute function public.forget_words_with_last_note();
