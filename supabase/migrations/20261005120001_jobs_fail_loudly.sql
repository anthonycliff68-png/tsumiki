-- Both scheduled jobs were silent when they were not configured.
--
-- run_notify_job and run_streak_job each read two secrets from Vault, and on a
-- missing secret they did `raise notice` and returned. A notice raised inside a
-- pg_cron job goes nowhere anyone reads, and cron records the run as a success,
-- so from every angle the job looked fine.
--
-- It was not fine. The secrets were never added to this project, so from 22
-- September to 5 October 2026 every tick of both jobs did nothing: no habit
-- reminder was ever delivered, and the "never miss twice" streak was never
-- evaluated. Nothing surfaced it — no error, no log, no failed run. It was
-- found only by wondering why a test push had not arrived.
--
-- So a missing secret is now an exception. cron.job_run_details records a
-- failed run with the message, which is the one place someone would look. A
-- job that cannot do its work should say so.
create or replace function public.run_notify_job()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_function_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';

  if v_url is null or v_key is null then
    raise exception
      'notify job not configured: add the notify_function_url and service_role_key secrets to Vault';
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

create or replace function public.run_streak_job()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'streak_function_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';

  if v_url is null or v_key is null then
    raise exception
      'streak job not configured: add the streak_function_url and service_role_key secrets to Vault';
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.run_notify_job() from public, anon, authenticated;
revoke all on function public.run_streak_job() from public, anon, authenticated;
