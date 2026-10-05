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
select jobname, status, return_message, start_time
from cron.job_run_details
order by start_time desc limit 20;
```

## When a push still does not arrive

Work down this list — each step rules out one layer.

1. **Did cron run?** `cron.job_run_details` above. A `failed` status with the
   "not configured" message means the secrets are still missing.
2. **Did the HTTP call go out?** `select status_code, created from net._http_response order by created desc limit 10;`
   A 401 means the service role key is wrong; nothing at all means `pg_net`
   is not doing its work.
3. **Did the function decide to send?** Edge Function logs in the dashboard.
   The rules it applies are in `supabase/functions/_shared/delivery.ts` and are
   under test — a habit is skipped if it is checked in, already sent today, not
   scheduled on this weekday, inside quiet hours, more than 3 hours past its
   moment, or the member is "heading out".
4. **Does the member have a token?** `profiles.push_token`. Expo Go can never
   receive push and a simulator cannot get a token; it needs a real device
   running a development or TestFlight build.
