# Backlog

Things we've decided we want, that aren't built yet. The build order in
[CLAUDE.md](CLAUDE.md) covers v1; this is what sits beyond or alongside it.

## Analytics board — wanted, not scheduled

A place to look back across days: how often each habit actually gets done, as
percentages and counts, and how that changes over time.

Asked for on 2026-09-22. Worth noting this is a **change to the brief** —
CLAUDE.md currently lists "charts and stats history" under *Out of v1*. Nothing
has been built for it, and nothing about the current schema blocks it: every
check-in is already stored with its local date, so the history is accumulating
whether or not anything reads it yet.

Rough shape when we come to it:
- percentage done per habit over a chosen window (7 / 30 / 90 days)
- current and best streak per habit, not just per crew
- which anchors actually hold, i.e. do habits stacked on "after lunch" land more
  often than the ones at a set time
- crew comparison: who is carrying the streak

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
