# Backlog

Things we've decided we want, that aren't built yet. The build order in
[CLAUDE.md](CLAUDE.md) covers v1; this is what sits beyond or alongside it.

Last checked against the code on 30 September 2026. Anything claimed here as
built was verified, not remembered — the previous version of this file had
drifted badly enough to be misleading.

## Analytics — in v1, built

Decided on 2026-09-22 to ship with v1, which **contradicts CLAUDE.md** — the
brief still lists "charts and stats history" under *Out of v1*. The brief has
not been edited; this note is the record.

The Progress tab is an overall completion rate for a day, week or month, and a
bar per habit sorted weakest first. Past eight habits it stops naming them all
and draws the spread instead, naming only the ones under a quarter. Tapping a
bar opens that habit: its rate, current and best run, the calendar for the
period, and which weekday it falls over on.

The arithmetic is in `src/lib/stats.ts` and `src/lib/streaks.ts`, under test.
The denominator is the part that matters — a day only counts if the habit was
due that weekday, already existed and was not archived.

Still to build:
- **the "see all" list** past eight habits. The link exists and goes nowhere.
- **crew comparison**: who is carrying the streak.

## My Day: a fuller custom schedule

Beyond the default moments, the ability to lay out a real day — a work schedule
Monday to Friday, specific things at specific times — and slot habits between
them. Partly served today by moments, which can have an end time and become a
block; wants more structure.

## Before the App Store will take it

Built: account deletion, reporting, blocking, a blocked list, a real 1024px
icon, and a privacy policy, terms and support page published and reachable at
the URLs in `src/constants/brand.ts`.

Still needed, and none of it is code:
- the **App Privacy questionnaire** in App Store Connect, matching what is
  really collected: email, habit names and check-ins, push token
- the **encryption declaration** (almost certainly exempt, but it must be
  answered)
- **being told** a report arrived. `npm run reports` reads the queue, but it is
  pull-only: nobody is alerted. The terms page now promises reports are read
  within 24 hours, so the gap between the promise and the practice is a
  commitment rather than an aspiration. A nightly Edge Function that emails on
  an open report would close it, and needs an email provider we do not have.

## Paywall — built, not released

Seven free days, then £3.99 a month or £29.99 a year, through RevenueCat and
Apple's In-App Purchase. Anyone who signed up before 1 November 2026 is
grandfathered. The rules are in `src/lib/entitlement.ts` under test, and it
fails open: an unreadable date or a backwards clock grants access rather than
locking someone out of a habit they are mid-streak on.

Built but never released — the products are not live in App Store Connect, so
nobody has ever seen the paywall outside a build. A **Restore purchases**
button is mandatory and should be checked before it goes anywhere near review.

## Not tested by two people

Every social feature — crews, nudges, the shared streak, invites, the nightly
streak job — is built and has only ever run with fixtures and a single account.
This is the largest untested surface in the app and the half the first
reviewer explicitly skipped.

## Waiting on something external

- **The Tsumiki domain.** Invites and the published pages currently live on
  GitHub Pages, which works but is not the name. Universal Links need the
  domain.
- **Deferred deep linking** (install, then land in the crew) — needs the domain
  plus a provider such as Branch. `src/lib/invite.ts` holds the code that would
  use it.
- **Custom SMTP.** Supabase's shared mail server allows two sign-in codes an
  hour, which is fine for one tester and not for a group.
