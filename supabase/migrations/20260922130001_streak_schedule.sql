-- Run the streak job every hour.
--
-- Hourly rather than nightly because "the day has ended" happens at a different
-- moment for every crew: one spread across Auckland and Honolulu only finishes
-- a day when its slowest time zone rolls over. The job itself skips any crew
-- whose day is not over yet, and skips dates it has already judged, so running
-- often is cheap and running twice changes nothing.

create extension if not exists pg_cron;
create extension if not exists pg_net;

/**
 * Calls the streak Edge Function. Both values live in Vault so no key is ever
 * written into a migration; until they are set the job says so and does
 * nothing, rather than failing every hour.
 */
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
    raise notice 'streak job not configured: add the streak_function_url and service_role_key secrets to Vault';
    return;
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

revoke all on function public.run_streak_job() from public, anon, authenticated;

-- Seven minutes past, so it is not competing with everything else on the hour.
select cron.unschedule('tsumiki-streak-hourly')
where exists (select 1 from cron.job where jobname = 'tsumiki-streak-hourly');

select cron.schedule('tsumiki-streak-hourly', '7 * * * *', 'select public.run_streak_job()');
