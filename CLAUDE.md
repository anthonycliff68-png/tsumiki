# Tsumiki — build brief for Claude Code

> App name: **Tsumiki** (積み木, "building blocks", said *tsoo-MEE-kee*). Keep it in one constant (`APP_NAME` in `src/constants/brand.ts`). Icon: three stacked blocks (orange, blue, off-white) on a dark tile with a blue glow. See the "Name 4 · Tsumiki" board on the canvas.

## What we're building

A phone app (iPhone + Android) for **building habits with friends, stacked onto the routine you already have.**

- You set up your day once: wake up, coffee, lunch, bed, and so on. These are **anchors**.
- Each habit hangs off an anchor ("after lunch → 15 min walk"), a set time, or "anytime today".
- Habits can be done solo or with a **crew** of 2–5 friends. Everyone in a crew does the same habit, but each person picks their own anchor.
- The crew shares one **streak**. Friends can **nudge** anyone who hasn't checked in yet.

One-line pitch: *Build habits with your people, one stack at a time.*

## Design source of truth

All screens are on the design canvas: https://claude.ai/artifact/Kj6tsoiGTL8XZYsrr8t1JV

Build from the **"Direction 2: cinematic dark"** rows and everything below them. Ignore the first row ("Early exploration (cream)") and the "Floating nav: concepts" row except `NavAB`, which is the chosen dock. Artboard names are listed next to each screen below.

## v1 scope

**In:**
1. Sign up / log in (email magic link + Sign in with Apple; Google on Android)
2. Onboarding: welcome → set routine anchors → pick first habit → invite crew or start solo
3. Today screen
4. My Day timeline
5. Create habit (stacked / at a time / anytime, color, solo or crew)
6. Crews: crew screen, group streak, member tiles
7. Invites: share link → web landing page → install → join straight into the crew (deferred deep link)
8. Nudges: send, push notification with quick actions, in-app nudge screen, thank-you reactions
9. Check-in from Today, My Day, the dock, a nudge, or a notification action
10. Push reminders at each habit's expected time

**Out of v1 (do not build yet):** charts and stats history, chat, rewards and badges, public profiles, more than one habit per crew, dark/light theme toggle (app is dark only), widgets, Apple Watch, web app.

## Tech stack

- **Expo** (React Native, TypeScript, `expo-router`). Develop with a development build, not Expo Go, because push and deep links need native config.
- **Supabase**: Auth, Postgres with Row Level Security on every table, Edge Functions, and scheduled jobs (`pg_cron`).
- **Push:** `expo-notifications` + Expo Push Service, sent from Edge Functions. Register notification categories so "Check in" and "Heading out now" work as quick actions without opening the app.
- **Invites and deferred deep linking:** Universal Links (iOS) and App Links (Android) on the invite domain. For the "install first, then land in the crew" case, use a deferred deep-link provider (Branch has a free tier) or store the invite code server-side against a short-lived device fingerprint. **Don't skip this.** The join flow depends on it.
- **Invite landing page:** a small static site (for example Next.js on Vercel) at `/j/:code` that reads crew info from a public, read-only Supabase view.
- **State:** TanStack Query for server data, Zustand for small local UI state.
- **Styling:** React Native StyleSheet + a `theme.ts` token file (below). `expo-blur` for glass surfaces. Fonts through `expo-font`.

## Design tokens (`src/theme.ts`)

```ts
colors: {
  bg: '#0B0B0C', surface: '#1C1C1F', glass: 'rgba(24,24,27,0.72)',
  text: '#F4F1EC', textMuted: '#BDB7AD', textFaint: '#9D978D',
  border: 'rgba(255,255,255,0.14)', success: '#7FD1A4',
}
habitColors: ['#3F5FA8','#E8552B','#1F8A8C','#8A5A9E','#E0A526','#C2306B'] // blue, orange, teal, purple, gold, magenta
fonts: { display: 'Archivo (condensed width 75%, weight 900, UPPERCASE, letterSpacing -1)', body: 'DM Sans 400/500/700' }
radii: { chip: 999, card: 16, bigCard: 22–30 }
```

- **Color bleed:** every screen has 2–3 large blurred circles behind the content, tinted with the color of the habit that screen is "about": the up-next habit on Today, the crew's habit on a crew screen, the selected color on Create habit. The glow cross-fades (~400 ms) when that color changes. Build it once as `<Bleed color={...} />`.
- **Dock (bottom nav):** a floating glass card, 12 px from the screen edges. Top row: a thin color bar, "UP NEXT · AFTER LUNCH", the habit name, a status line, and a 60 px **check-in orb** in the habit's color, vertically centered in the row, with a progress ring showing today's done/total. Bottom row: tabs Today / My Day / Crews / You. Artboard: `NavAB`.
- Touch targets ≥ 44 px. Real buttons with accessibility labels, including icon-only ones.

## Screens (artboard names in brackets)

| Screen | Artboard | Notes |
|---|---|---|
| Welcome | `OnbWelcome` | "I have an invite link" goes to the join flow |
| Routine setup | `OnbRoutine` | Default anchors + optional extras; times are rough |
| First habit | `OnbHabit` | 6 suggestions pre-matched to the user's anchors |
| Crew prompt | `OnbCrew` | Invite friends or start solo |
| Today | `TodayDark` | Big date, done count, hero card for the up-next habit, "Up next" row |
| My Day | `MyDay` | Vertical timeline: anchors (muted), stacked habits under their anchor, timed habits at their time, NOW line, free-time gaps ("2 free hours → add a habit") |
| Create habit | `NewHabitDark` | Name, When (After / At a time / Anytime), anchor or time, color, crew/solo. Live sentence preview |
| Crew | `GroupDark`, `CrewWalk` | Group streak, last 7 days, member tiles with In / Nudge / Check in |
| Invite: send | `InviteSend` | Preview of the message + link card, share sheet |
| Invite: web page | `InviteLanding` | Web, not app |
| Invite: join | `InviteJoin` | Pick your own anchor + time, join |
| Invite: joined | `InviteJoined` | Confirmation, first check-in time |
| Nudge: send | `NudgeSend` | Bottom sheet with preset messages |
| Nudge: push | `NudgeNotif` | Push content + quick actions |
| Nudge: open | `NudgeOpen` | Opened from the push |
| Nudge: done | `NudgeDone` | Streak saved + thank-you reactions |

## Data model (Supabase)

```
profiles        id (= auth.users.id), display_name, avatar_color, timezone, push_token, quiet_start, quiet_end, created_at
anchors         id, user_id, label, usual_time (time), sort_order, is_default
habits          id, owner_id, name, color, crew_id (nullable), created_at, archived_at
habit_schedules id, habit_id, user_id, mode ('after'|'at'|'any'), anchor_id (nullable), at_time (nullable),
                days_of_week int[]  -- one row per member: each person picks their own moment
crews           id, name, habit_id, created_by, created_at, streak_current, streak_best, streak_updated_on
crew_members    crew_id, user_id, joined_at, role ('owner'|'member'), grace_used (bool)
checkins        id, habit_id, user_id, local_date (date), created_at   -- unique (habit_id, user_id, local_date)
nudges          id, crew_id, from_user, to_user, message, local_date, created_at, status ('sent'|'delivered'|'acted')
                -- unique (from_user, to_user, local_date)
reactions       id, nudge_id, from_user, kind ('thanks'|'same_time_tmrw'), created_at
invites         code (short, unique), crew_id, created_by, created_at, expires_at (7 days), uses
status_events   id, crew_id, user_id, kind ('heading_out'), created_at, expires_at
```

- A crew has max 5 members (enforce in the join function, not just the UI).
- RLS: users read and write their own rows. Crew members can read their crew, member profiles (name + color only), check-ins, and nudges. Only Edge Functions (service role) write streak fields.

## Rules that matter

**Scheduled day.** A habit is due for a member on a date if that weekday is in their `days_of_week`. Dates are always the member's **local** date (their `timezone`).

**Group streak: "never miss twice."**
- A member *misses* a scheduled day if they have no check-in for that local date.
- One miss is forgiven: set `grace_used = true` for that member, and the crew streak carries on.
- If a member misses while `grace_used` is already true (a second miss in a row), the crew streak resets to 0.
- A check-in resets that member's `grace_used` to false.
- The streak goes up by 1 for each day the crew gets through without a reset.
- Evaluate with a nightly job per crew, after the day has ended for the member in the **latest** time zone. Store `streak_updated_on` so the job is idempotent.
- UI: show when a member's grace is in use ("one miss, back tomorrow keeps it alive"). Wording goes on the crew screen.

**Nudges.**
- One nudge per sender → recipient per local day (unique constraint + friendly error).
- Only allowed if the recipient hasn't checked in yet today.
- Preset messages: "Walk time!", "You're the last one", "Don't leave us hanging", "Streak's on you", plus custom text (max 60 chars).
- Delivery: if the recipient's scheduled moment hasn't happened yet, hold the push until their anchor or time. Never deliver inside quiet hours; wait until they end.
- Push title: "{sender} nudged you". Body: "“{message}” {crew} is {n} of {total}. You're the last one." (last line only when true).
- Quick actions: **Check in** (creates a check-in without opening the app) and **Heading out now**.

**Heading out now.** Creates a `status_events` row, shows "{name}'s on the way" to the crew for 30 minutes, and pauses reminders and nudges to that user for 30 minutes.

**Reminders.** One push at each habit's expected moment (anchor time or set time). "Anytime" habits get one reminder at 8 pm local if still open. No reminder once checked in.

**Check-in.** Idempotent per (habit, user, local_date). When the last member of a crew checks in, send the crew a "Streak saved · {n} days" push, and show the `NudgeDone`-style screen to whoever finished it.

## Build order

Work in small steps. Get each one running on a device before starting the next.

1. **Skeleton:** Expo + expo-router, theme tokens, fonts, `<Bleed>`, dock component with static data, 4 tabs.
2. **Supabase:** project, schema + RLS migrations, generated types, auth (magic link + Apple).
3. **Onboarding + anchors:** routine setup writes `anchors`; first-habit picker writes `habits` + `habit_schedules`.
4. **Solo loop:** Today, My Day timeline, create habit, check-in. Real data end to end.
5. **Reminders:** push token registration + scheduled reminders.
6. **Crews:** create crew, crew screen, member tiles, check-in states.
7. **Streak job:** nightly Edge Function + `pg_cron`, with unit tests for the "never miss twice" rules (miss once, miss twice, time zones, schedule gaps).
8. **Invites:** invite codes, share sheet, web landing page, universal/app links, deferred deep link, join flow.
9. **Nudges:** send sheet, delivery rules, push with quick actions, open screen, reactions, heading out.
10. **Polish:** bleed color transitions, orb progress ring animation, haptics on check-in, empty states, error states.

## Working rules for Claude Code

- TypeScript strict. No `any` in app code.
- Match the design canvas closely. When something isn't designed (errors, empty states, loading), reuse the same components and tone rather than inventing a new style.
- Ask before adding a dependency that isn't listed above.
- Don't build anything from "Out of v1" without asking.
- Put all user-facing copy in `src/copy.ts` so wording is easy to change.
- Write tests for the streak and nudge rules. They're the parts most likely to break quietly.
- After each build-order step, summarize what works, what's stubbed, and how to try it on a device.

## Open questions (decide before or during build)

- Before launch: confirm the Tsumiki domain, social handles and a US trademark search. Produce the final 1024 px icon from the canvas concept.
- Should a crew be able to change its habit later, or only create a new crew?
- What happens to a crew when someone leaves mid-streak? (Suggested: the streak continues for the rest.)
- Monetization, if any, is not part of v1.
