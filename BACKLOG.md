# Backlog

Things we've decided we want, that aren't built yet. The build order in
[CLAUDE.md](CLAUDE.md) covers v1; this is what sits beyond or alongside it.

## Analytics board — in v1, partly built

A place to look back across days: how often each habit actually gets done, as
percentages and counts, and how that changes over time.

Decided on 2026-09-22 to ship with v1, which **contradicts CLAUDE.md** — the
brief still lists "charts and stats history" under *Out of v1*. The brief has
not been edited; this note is the record.

Built: the Progress tab, week / month / all-time windows, per-habit completion
rate, current and best run, a by-weekday breakdown, a due-day grid, and Reset
history. The arithmetic is in `src/lib/stats.ts` under test — the denominator is
the part that matters, since a day only counts if the habit was due that
weekday, already existed and was not archived.

Still to build:
- **choosing which weekdays a habit runs on.** `habit_schedules.days_of_week`
  has been in the schema since the start but nothing writes it, so every habit
  is every day. Until this exists the weekday breakdown can only ever show a
  flat week.
- **delete my account and data.** Needed for the App Store, not just for
  tidiness. Reset history clears check-ins only.
- crew comparison: who is carrying the streak.

## My Day: a fuller custom schedule

Beyond the default anchors, the ability to lay out a real day — a work schedule
Monday to Friday, specific things at specific times — and slot habits between
them. Partly served today by anchors; wants more structure.

## Waiting on something external

- **Web invite landing page** and Universal Links — needs the Tsumiki domain.
- **Deferred deep linking** (install, then land in the crew) — needs the domain
  plus a provider such as Branch.
- **Push on a device**, and a second test account — needs a development build,
  which needs the Apple Developer account.
