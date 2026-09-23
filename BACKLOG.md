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

## Before the App Store will take it

Built: account deletion, reporting, blocking, a blocked list.

Still needed, and none of it is code:
- a **privacy policy** and **terms** actually published at the URLs in
  `src/constants/brand.ts`, which are placeholders pointing at a domain that
  does not exist yet
- the **App Privacy questionnaire** in App Store Connect, matching what is
  really collected: email, habit names and check-ins, push token
- a real **1024px icon** — the default Expo one is still in `assets/`
- screenshots, description, keywords, age rating, support URL
- the encryption declaration (almost certainly exempt, but it must be answered)
- a way for **us** to read the reports queue. Reports are written to
  `public.reports` and only the service role can read them; there is no
  console yet, and the app promises a 24-hour response.

## Paywall

Digital subscriptions must go through Apple's In-App Purchase — Stripe is not
allowed for this. The route is RevenueCat (`react-native-purchases`), a config
plugin and a development build. Banking and tax details have to be complete in
App Store Connect before IAP works at all, and a Restore purchases button is
mandatory.

Not yet decided: what is actually paid. Gating crews would put a paywall in
front of an invited friend before they have done anything, so history depth,
habit count or crew count are the safer levers.

## Waiting on something external

- **Web invite landing page** and Universal Links — needs the Tsumiki domain.
- **Deferred deep linking** (install, then land in the crew) — needs the domain
  plus a provider such as Branch.
- **Push on a device**, and a second test account — needs a development build,
  which needs the Apple Developer account.
