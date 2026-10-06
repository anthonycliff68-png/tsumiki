# Scheduled jobs — the manual step that is easy to miss

Tsumiki has two `pg_cron` jobs. Both call an Edge Function over HTTP, and both
need three secrets that **migrations cannot create for you**, because one of
them is the service role key and that must never sit in a file in this repo.

| Job | Schedule | Calls | Does |
|---|---|---|---|
| `tsumiki-notify` | every 10 min | `/functions/v1/notify` | habit reminders, held nudges, "streak saved" |
| `tsumiki-streak` | hourly at :07 | `/functions/v1/streak` | evaluates "never miss twice" |

## The secrets

Run this once per Supabase project, in the SQL Editor. The service role key is
in **Project Settings → API → `service_role`**.

```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/notify', 'notify_function_url');
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/streak', 'streak_function_url');
select vault.create_secret('<service role key>', 'service_role_key');
```

Check they are there:

```sql
select name from vault.secrets order by name;
```

## Why this file exists

From 22 September to 5 October 2026 these secrets were missing in production.
Both jobs ran on schedule, found no secrets, and returned without doing
anything. No reminder was ever delivered and no streak was ever evaluated —
for two weeks, in a shipped build, with nothing anywhere saying so.

The jobs now `raise exception` instead of returning quietly, so a missing
secret shows up as a failed run:

```sql
select j.jobname, d.status, d.return_message, d.start_time
from cron.job_run_details d
join cron.job j on j.jobid = d.jobid
order by d.start_time desc limit 20;
```

`job_run_details` has no `jobname` of its own — it carries `jobid`, so the
join is what gives you a readable name.

## When a push still does not arrive

Work down this list — each step rules out one layer.

1. **Did cron run?** `cron.job_run_details` above. A `failed` status with the
   "not configured" message means the secrets are still missing.
2. **Did the HTTP call go out, and what came back?**

   ```sql
   select status_code, left(content::text, 90) as body, created
   from net._http_response order by created desc limit 10;
   ```

   This is the step that matters most, because a cron run says `succeeded`
   as soon as the SQL function returns — `net.http_post` only queues the
   request, so the call can fail long after the job is recorded as fine.
   `401 UNAUTHORIZED_INVALID_JWT_FORMAT` means the `service_role_key` secret
   is not a real key; nothing at all means `pg_net` never sent it.
3. **Did the function decide to send?** Edge Function logs in the dashboard.
   The rules it applies are in `supabase/functions/_shared/delivery.ts` and are
   under test — a habit is skipped if it is checked in, already sent today, not
   scheduled on this weekday, inside quiet hours, more than 3 hours past its
   moment, or the member is "heading out".
4. **Does the member have a token?** `profiles.push_token`. Expo Go can never
   receive push and a simulator cannot get a token; it needs a real device
   running a development or TestFlight build.
