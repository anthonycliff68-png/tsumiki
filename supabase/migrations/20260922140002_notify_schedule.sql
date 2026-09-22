-- Reminders and held nudges are checked every ten minutes: a habit's moment can
-- be any minute of the day, and a nudge held for someone's anchor should land
-- close to it. The job itself records every send, so ticking often is cheap.

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
    raise notice 'notify job not configured: add the notify_function_url and service_role_key secrets to Vault';
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

revoke all on function public.run_notify_job() from public, anon, authenticated;

select cron.unschedule('tsumiki-notify')
where exists (select 1 from cron.job where jobname = 'tsumiki-notify');

select cron.schedule('tsumiki-notify', '*/10 * * * *', 'select public.run_notify_job()');
