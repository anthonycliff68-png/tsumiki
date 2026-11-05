-- How long a habit or a to-do takes, for the My Day timeline. Moments already
-- have ends_at. Null means no length, which is everything until somebody says
-- otherwise, so older copies of the app that never send it are unaffected.
alter table public.habit_schedules
  add column duration_minutes integer
  check (duration_minutes is null or duration_minutes between 1 and 1440);

alter table public.todos
  add column duration_minutes integer
  check (duration_minutes is null or duration_minutes between 1 and 1440);
