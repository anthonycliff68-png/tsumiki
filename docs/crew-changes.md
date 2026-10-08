# Changing a crew

A spec, written before the code, because every hard question here is about the
streak — and the last streak bug came from a rule that had been stated in prose
and never fully pinned down.

Four things people should be able to do: rename a crew, remove and add members,
swap the habit, and have crews bigger than five. The first three are worth
doing. The fourth I would not do, and the reason is in **The cap** below.

---

## The rule everything else hangs off

> **Membership changes take effect tomorrow. They never rewrite yesterday.**

Without it, removing someone becomes a way to rescue a streak: a member misses
twice, the owner removes them before the nightly job runs, the reset never
happens, and the number on the crew screen is a lie. The streak is the one
thing the app asks people to believe, so it has to be unriggable.

With it:

- Removing someone does not change whether today was already lost.
- Adding someone does not put a fresh streak at risk on their first day.
- Past days stay exactly as they happened. The job evaluates each date against
  who was due *on that date*.

This needs `crew_members` to stop being a statement about now and start being a
statement about a period: a `left_on` date rather than a deleted row, so the
nightly job can ask "who was in this crew on 3 October" and get the right
answer a month later.

```sql
alter table public.crew_members add column left_on date;
```

A member is due on a date when `joined_at::date <= date` and
(`left_on is null` or `date < left_on`). Removal sets `left_on` to tomorrow in
that member's own timezone. The row stays.

---

## 1. Rename a crew

The smallest of the four, and the database is already there: the
`crews_update_owner` policy from 27 September lets the creator update the crew.
Nothing in the app has ever called it.

- Owner only. A crew's name is shown to everyone in it; a free-for-all is a
  fight waiting to happen.
- Same validation as creation: trimmed, 1–40 characters.
- No streak implications at all.

**Work:** a field on the crew screen, one mutation. No migration.

---

## 2. Remove and add members

### Removing

- **Owner only**, and the owner cannot remove themselves — leaving is a
  different action with different consequences, and it already exists.
- Sets `left_on` to tomorrow, local to the person being removed.
- They keep their check-in history. It happened.
- The crew screen says who is no longer in it, once, rather than having
  somebody silently vanish.

### Adding

Adding is the invite flow that already exists. The only new rule is about the
streak:

- **A new member is not due until their first check-in.** They opt in by
  turning up, rather than inheriting an obligation on day one.
- Concretely: a member with no check-in for this crew's habit yet is skipped by
  the nightly job. Once they check in once, they are due on their scheduled
  days like everybody else.

This stops the obvious unfairness — joining a crew on a 40-day run and ending
it before you have done anything — without needing a grace period that has to
be explained.

### What happens to a crew with one member left

Nothing special. A crew of one is a solo habit with a streak, which is a
perfectly reasonable thing to be, and it already happens today when people
leave.

---

## 3. Swapping the habit

The open question from the original brief, finally answered.

### Who decides

Not the owner alone. Everyone in the crew agreed to *this* habit; changing it
under them is the kind of thing that makes people leave.

**But pure unanimity is a trap.** One unresponsive person blocks the crew for
ever, and their only escape is to abandon the crew and rebuild it. So:

- The owner proposes a new habit.
- Every other member accepts or declines.
- **All accept** → the habit changes.
- **Anyone declines** → the proposal ends immediately. No partial state.
- **Nobody has answered in 7 days** → the proposal lapses. Nothing changes and
  it can be proposed again.

```sql
create table public.crew_habit_proposals (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  proposed_by uuid not null references public.profiles (id),
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  status text not null default 'open'   -- open | accepted | declined | lapsed
);

create table public.crew_habit_votes (
  proposal_id uuid not null references public.crew_habit_proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  accepted boolean not null,
  voted_at timestamptz not null default now(),
  primary key (proposal_id, user_id)
);
```

### What happens to the streak

**It survives.** The crew kept turning up; switching from stretching to walking
does not undo that. The streak belongs to the crew's continuity, not to a
particular habit.

### What happens to everyone's schedule

Each member picks their own moment for a habit — that is the whole idea — so a
new habit cannot inherit the old moments blindly. On acceptance, each member's
schedule carries over by **mode**: a habit that was "after lunch" stays after
lunch, one that was "at 5pm" stays at 5pm. If their anchor no longer exists it
falls back to anytime, which is what deleting an anchor already does.

### What happens to history

The old habit is archived, not deleted. Its check-ins stay, and show on
Progress as a habit that ended. The crew points at a new habit from the day the
change was accepted.

---

## 4. The cap — I would keep it at five

Raising it is one line. The reason not to is that **"never miss twice" does not
survive it.**

The crew streak ends when any member misses twice in a row. Every member added
is another independent chance of that happening. At five it is already fragile
enough to matter, which is the point — it is what makes turning up feel like it
counts. At fifteen it would reset more or less permanently, and a number that
always reads zero is worse than no number.

It breaks nudges too. One nudge per sender per recipient per day is reasonable
at five. In a twenty-person crew it is nineteen messages a day about one habit,
and the terms say plainly that nudges are not for pressure.

And "a group small enough to care" is the positioning. The App Store
description says *two to five friends*.

**If bigger crews are genuinely wanted**, the streak rule has to change with
them — something like "the crew keeps its streak if most members turn up". That
is a different product and deserves its own decision, not a raised constant.

The cap currently lives in three places and they must move together if it ever
does: the trigger in `20260921120001_init_schema.sql`, the join check in
`20260922120001_invites.sql`, and `copy.ts`.

---

## Order of work

1. **Rename.** No migration, no rule changes. A day.
2. **`left_on`, and the nightly job reading it.** This is the foundation and
   the only part with a correctness risk, so it gets tests of its own:
   removed-yesterday, removed-today, joined-mid-streak, never-checked-in.
3. **Remove and add in the UI.** Small once 2 is done.
4. **Habit swap.** The proposal flow is the real work — two tables, an RPC,
   a vote screen, and the expiry needs a job or a check on read.
5. **The cap.** Not planned.

---

## What has to be true before any of it ships

The streak job must be able to answer "who was due in this crew on this date"
for any past date. Today it asks "who is in this crew now", and that is the
assumption every one of these features breaks.
