# Tsumiki — what exists, as of 14 October 2026

Written as a handoff for a separate planning session. Everything here is read
off the codebase, not remembered.

## Stack

**React Native, not SwiftUI.** Expo SDK 57, React Native 0.86.3, React 19.2.3,
TypeScript strict, `expo-router` for file-based routing. Built as a development
build rather than Expo Go, because push notifications and deep links need
native configuration.

- **Backend:** Supabase — Postgres with RLS on every table, Edge Functions in
  Deno, `pg_cron` for scheduled jobs.
- **Server state:** TanStack Query. **Local UI state:** plain React state.
- **Payments:** RevenueCat (`react-native-purchases` 10.10.2).
- **Push:** `expo-notifications` + Expo Push Service, sent from an Edge Function.
- **Styling:** React Native StyleSheet with a token file (`src/theme.ts`),
  `expo-blur` for glass, `expo-glass-effect`, fonts via `expo-font`.
- **No Reanimated.** Animation is RN `Animated` with the native driver. Worth
  knowing before planning anything motion-heavy.
- **OTA:** `expo-updates` is configured against `u.expo.dev` with a fingerprint
  runtime policy, so JavaScript-only changes ship without a new binary.

## Screens that exist

Thirty routes under `src/app/`. Everything listed is built and reachable.

**Auth** — `(auth)/welcome` (carousel), `(auth)/sign-in`, `auth-callback`.

**Onboarding** — `(onboarding)/routine` (set your anchors), `/habit` (pick a
first habit), `/crew` (invite or go solo), `/profile`.

**Tabs** — `(tabs)/index` (Today), `/my-day` (hour-grid timeline), `/crews`,
`/progress`, `/you`.

**Core** — `new-habit`, `schedule` (the moments of your day), `habit/[id]`
(one habit and its history), `crew/[id]`.

**Crew and social** — `invite/[id]` (share sheet), `j/[code]` (join from an
invite), `nudge/[id]`.

**Account** — `account` (change email or password), `reset-password`,
`delete-account`, `notifications`, `appearance` (light/dark/system), `blocked`,
`feedback`.

**Paywall** — `plans`.

## Data model

Fifteen tables: `profiles`, `anchors`, `habits`, `habit_schedules`, `crews`,
`crew_members`, `checkins`, `nudges`, `reactions`, `invites`, `status_events`,
`notification_sends`, `feedback`, `blocks`, `reports`.

The shape worth knowing: a habit hangs off an **anchor** ("after lunch"), a set
time, or "anytime today". A crew is 2–5 people doing the *same* habit, each
with their own anchor, sharing **one streak**. `habit_schedules` is one row per
member, which is what makes that work.

## Edge Functions and scheduled jobs

- `notify` — reminders, held nudges, "streak saved" pushes. Every 10 minutes.
- `streak` — the nightly "never miss twice" evaluation. Hourly, per crew, after
  the day has ended in the member's own time zone.
- `feedback-digest` — forwards written-in feedback to an inbox. Every 15 minutes.

## Rules that are non-obvious

- **Group streak is "never miss twice."** One missed day is forgiven and sets
  `grace_used`; a second consecutive miss resets the crew streak to 0. A
  check-in clears the grace.
- **Everything is the member's local date**, from their `profiles.timezone`.
- **Nudges**: one per sender → recipient per local day, only if the recipient
  has not checked in, held until their moment, never inside quiet hours.
- **Access**: accounts created before 2026-10-09T14:48Z (the minute 1.1.0 hit
  the App Store) are grandfathered permanently. Everyone else needs a
  subscription; the three free days come from Apple's introductory offer.

## Testing

244 unit tests across 53 suites, run with `node --test`. They cover the pure
rule files — streak evaluation, nudge delivery, entitlement, the feedback
digest — not the UI.

## What is NOT built

- **Deferred deep linking.** An invite opens a web page; installing from it
  lands you on Today, not in the crew.
- **Crew member add/remove UI.** The backend (`left_on`, the RPC) exists and
  nothing calls it. An owner can rename a crew but cannot remove anyone.
- **Universal links.** `associatedDomains` is committed but inert — it needs a
  native build and a domain that serves an `apple-app-site-association` file.
- Out of scope by decision: charts and stats history, chat, rewards and badges,
  public profiles, more than one habit per crew, widgets, Apple Watch, web app.

## Release state

1.2.0 live since 13 October. 1.2.1 submitted the same evening, set to release
automatically on approval.
