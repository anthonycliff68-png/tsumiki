-- Send the feedback digest every quarter of an hour.
--
-- Quarter-hourly rather than daily because the point of the button is that
-- somebody can tell you the app is broken, and a report that waits until
-- tomorrow morning is a report about a problem that has had all night to
-- spread. Quarter-hourly rather than every minute because the function sends
-- nothing when there is nothing, and ninety-six quiet runs a day is already
-- plenty of noise in the logs.
--
-- The same shape as run_notify_job: the URL and the key live in Vault, not in
-- the migration, so this file can be committed and the secrets cannot.

create or replace function public.run_feedback_digest_job()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets
    where name = 'feedback_digest_function_url';
  select decrypted_secret into v_key from vault.decrypted_secrets
    where name = 'service_role_key';

  if v_url is null or v_key is null then
    raise notice 'feedback digest not configured: add feedback_digest_function_url to Vault';
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

revoke all on function public.run_feedback_digest_job() from public, anon, authenticated;

select cron.unschedule('tsumiki-feedback-digest')
where exists (select 1 from cron.job where jobname = 'tsumiki-feedback-digest');

select cron.schedule(
  'tsumiki-feedback-digest',
  '*/15 * * * *',
  'select public.run_feedback_digest_job()'
);
