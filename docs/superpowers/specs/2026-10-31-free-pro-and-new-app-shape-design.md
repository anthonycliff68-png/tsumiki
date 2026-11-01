# Free + Pro, new onboarding, and the new shape of the app

Design written 31 Oct 2026 from a brainstorm with Anthony. Mockups are in
`.superpowers/brainstorm/70524-1793456315/content/` (gitignored, local only):
`all-screens-v7.html`, `full-app.html`, `brain-dump-notes.html`, `round2-v2.html`.

Lines marked **(my call)** were decided by Claude, not Anthony. Anthony
should check them.

## Why

Tier 1 this month is RevenueCat subscriptions, retention and growth.

- **Today:** Tsumiki is a hard paywall. The whole app is behind
  `PaywallGate` after a 3-day trial, so nobody can use it for free.
- **The new pitch:** *Tsumiki plans your day visually so your brain isn't
  scattered.* Habits, to-dos and your calendar sit on one timeline that you
  rearrange by dragging.
- **The new model:**
  - A useful Free tier gets people in and keeps them.
  - Pro sells the things that make the planner feel limitless: the AI brain
    dump, calendar, crews, and no caps.
- **Onboarding** should feel like Structured (Apple Design Award 2026): one
  simple question per page, building your actual day as you go.

## Goals

- **Free tier.** Day planning, **5 habits**, **5 to-dos**, notes with folders
  (no AI sorting).
- **Pro.** Unlimited habits and to-dos, Crews, calendar events on the
  timeline, and the AI brain dump.
- **Prices.** $3.99/month, $29.99/year, and lifetime ($99.99, the App
  Store's nearest price point to the "$100" Anthony asked for).
- **Onboarding.** A short, easy, step-by-step setup that ends on the user's
  own My Day and then an "Upgrade to Pro" screen that is easy to say no to.
- **Edit and drag everything.** Everything in My Day can be dragged
  (moments, habits, to-dos) and tapped to edit.
- **New dock.** My Day · Notes · ＋ · Crews · You.

## Non-goals

- Changing the mountain-and-glass visual style. Anthony likes how the app
  looks now. Everything new is built from the existing pieces (glass cards,
  Archivo display type, habit colours, hour pills).
- Changing the "never miss twice" streak rule.
- Adding skips, rest days or "Skip today". Anthony dropped Skip today: a
  habit can be moved or edited, not skipped.
- Chat between users, friend search, or customising which habits crewmates
  can see. These are in Anthony's idea log, but they are later work.

## Anti-goals (would count as failure even if it works)

- Someone who paid, or an early user promised the app for free, loses
  anything. `GRANDFATHERED_BEFORE` users and active subscribers are Pro.
- Free feels broken or nagging. Limits show up only when the user reaches
  for something more, and each one says plainly what Pro adds.
- The paywall lists something that isn't in the app. App Review rejects
  this. A feature that isn't shipped yet is labelled "Soon" until it is.
- Onboarding pages that pack in more than one idea. Anthony was explicit
  that each page shows very little.

## The parts, in build order

Each part ships on its own. The order puts money first.

### 1. Free vs Pro (prices, limits, paywall)

**Products**
- Monthly and yearly already exist in App Store Connect and RevenueCat.
- Add a **Lifetime** non-consumable at $99.99, attached to the same Pro
  entitlement and added to the default offering.
- Creating the product in App Store Connect needs Anthony's OK.
- The current yearly plan includes a 3-day free trial. Keep it as it is
  **(my call)**.

**Access model**
- Replace the app-wide `PaywallGate` with Free or Pro.
- Pro is anyone with the entitlement, anyone grandfathered, or anyone still
  inside a legacy `trial_started_at` window. This is `hasAccess` today,
  reused as `isPro`.
- Everyone else is Free, and nobody is locked out any more.

**Limits.** Each check runs at the moment of reaching for it, and each
opens the paywall:

| Action | Free | Pro |
|---|---|---|
| Add habits | Up to 5 | Unlimited |
| Open to-dos | Up to 5 | Unlimited |
| Crews: open the tab, start one, or join through an invite | Paywall | Yes |
| Calendar events on the timeline | Paywall | Yes |
| Brain dump (AI) | Paywall | Yes |
| Notes, folders, day planning, drag and edit | Yes | Yes |

**Existing data over a limit.** A user who drops from Pro to Free keeps
everything they already have. Nothing is deleted or hidden **(my call)**.
They just can't add more until they're under the limit.

**Crews and Free users.** A crew member who isn't Pro stops counting as
"due", which is what already happens when a trial lapses
(`supabase/functions/_shared/access.ts` mirrors this rule).
- So a Free member never breaks the crew's streak.
- They can still see the crew **(my call)**. A crew is two to five friends,
  and locking someone out of a group they're in feels worse than the upsell
  is worth.

**Paywall screen** ("Upgrade to Pro")
- A Free vs Pro table: day planning; habits 5 / ∞; to-dos 5 / ∞; crews;
  calendar; AI brain dump.
- Three plans: yearly (pre-selected, "Best value"), monthly, lifetime.
- **Upgrade to Pro**, then **Continue with Free** or **Not now**.
- Restore, Terms and Privacy links.
- It is reachable from:
  - the end of onboarding
  - every limit above
  - the ✦ AI button (see Part 3)
  - You → Subscription

**App Store listing.** The description currently says "free for three
days, then $29.99 a year". It has to change to describe Free + Pro, in the
same release.

### 2. New onboarding

One question per page, with a progress bar at the top. Big Archivo
headline, one control, very little text. A small "Your day" timeline at the
bottom of each page fills in as the user answers.

1. **Welcome.** "Plan your day. Clear your head." Button "Let's build my
   day", and "I have an invite link" underneath.
2. **Wake up and bed.** Two time wheels on one page.
3. **Moments.** Tap chips for what already happens every day (Coffee,
   Lunch, Get home, Gym, Dinner, ＋ your own).
   - Times are guessed from the wake and bed times; the user fixes them
     later by dragging.
   - Reuse the existing routine defaults and the matching logic from
     `(onboarding)/routine.tsx` and `habit.tsx`.
4. **First habit.** Three suggestions, each already stacked on one of
   *their* moments, plus "Write my own".
5. **Calendar.** "Bring in your plans?" toggle, read-only, with "Not now".
   - **Only if** Monday's expo-calendar decision is yes. Otherwise this page
     is left out.
   - Calendar is Pro, but it's shown during onboarding so the user sees it
     working.
   - **Open:** does a Free user keep calendar events after onboarding, or
     only during the trial? See open questions.
6. **To-dos.** "Anything to get done today?" One line each, or Skip. These
   go to "anytime".
7. **Here's your day.** Their real My Day, with everything they answered.
   - One tip: "Hold anything to drag it. Tap anything to edit it. Try
     moving Lunch."
   - Then "Looks good".
8. **Upgrade to Pro.** The paywall from Part 1, with "Continue with Free".

**Leaves onboarding**
- Profile (name, emoji, colour). It's asked the first time someone starts
  or joins a crew.
- The crew prompt.

### 3. The new app layout

**Dock:** My Day · Notes · **＋** · Crews · You.

**My Day** (first tab) absorbs Home.
- **Header:** day, date, and a ring labelled "**2 of 4** habits done".
  Tapping the ring lists what's left.
- **Below the header:** Day / Week / Month (exists today), today's to-dos,
  a small "Head full?" brain dump card, then the timeline.
- **Home's swipeable habit cards (`HabitFan`) are removed** **(my call)**.
  Anthony didn't object when asked. If he wants them back, they become a
  thin strip.

**Notes** is new. See Part 7.

**＋ is a stack of blocks** in today's habit colours ("tsumiki" means
building blocks).
- Tapping it makes the blocks tumble up into four buttons: **Brain dump
  (Pro)**, **Note**, **Habit** and **To-do**.
- Moments are added from My Day **(my call)**.
- The current dock has a check-in orb (`CheckInOrb`) and a "now" row. The
  ＋ replaces the orb; checking in happens from My Day.

**Crews** stays as it is.
- A round ＋ in the header starts a crew.
- A one-line nudge under the list suggests a habit with no crew ("Your 📖
  Read habit has no crew yet. Bring someone ›").
- On Free, the tab explains crews and opens the paywall.

**You** absorbs Progress.
- Profile at the top with a Pro badge, then a Progress summary card (the
  30-day figure plus one "needs work" line) that opens the full Progress
  screen.
- Then Notifications, Appearance, Subscription and Account.

**✦ AI button on every tab's header.**
- It opens the brain dump.
- On Free it opens the paywall.
- Anthony asked for this to be visible everywhere.

### 4. Drag and edit everything in My Day

**Drag**
- Habits and to-dos already drag (`useMoveHabit`, to-dos into hours or
  anytime).
- **New:** dragging a **moment** changes its time, and the habits stacked
  on it move with it.
  - It saves through the existing `useUpdateAnchor`.
  - Choosing whether this changes today only or the moment's usual time is
    left to the builder. Changing the usual time matches today's
    MomentSheet behaviour.

**Tap to edit** opens a sheet for each kind of item:
- **Moment:** name, time, icon, the habits stacked on it, Remove. This
  extends `MomentSheet`.
- **Habit:** when it happens, days, colour, and Edit habit ›. This links to
  `habit/[id]`.
- **To-do:** text, when, Delete.

### 5. Calendar, read-only (Pro)

Blocked on Monday's yes/no on `expo-calendar`.
- Events show as blue-barred cards on the timeline.
- They are never edited.
- This needs its own small design once it's a yes.

### 6. Brain dump: Catch → Sort → Plan (Pro)

This is the v1 shape. Model choice, cost and the prompt get their own round
before building.

- **Catch.** Talk or type messily into one box, then "Sort it".
- **Sort.** "Here's what I heard", grouped into:
  - things on today's timeline (anything with a time)
  - to-dos
  - notes, each with a suggested folder
  - habit ideas, which are opt-in only and never added automatically

  The user taps a row to fix it, swipes to drop it, then "Add N to my day".
- **Plan.** Items land in My Day marked "✦ new". Notes go to their folder,
  or to Inbox.
- **Until Notes exists,** notes from a dump go to an Inbox list.
- **The paywall shows Brain Dump as "Soon"** until this ships.

### 7. Notes (free; AI filing is Pro)

- **Notes home:** search, a 2×2 grid of folders coloured like habits
  (one is **Inbox**), and Recent.
- **A folder:** notes newest first, grouped under day headers ("Today · Sat
  Oct 31", "Thu Oct 29").
  - **No hour timeline.** Anthony: what matters is seeing the notes, not
    when they were written.
  - Each note gets its date automatically. There are no manual tags.
- **Writing a note:** plain text, auto-dated, with folder, To-do and 🎙️
  buttons. A note can become a to-do, or a habit with Pro, in one tap.
- **Free users** pick the folder themselves. Pro users get AI filing
  through the brain dump.

**Built 31 Oct (Part 1, not committed):** `PaywallGate` removed; `src/lib/pro.ts`
holds `FREE_HABITS`/`FREE_TODOS`, `useIsPro`, `showUpgrade`. Gates are in
`new-habit.tsx` (sixth habit), Home's to-do input (sixth open to-do), Crews
"Start a crew", and invite join. The paywall has a Free vs Pro table, plan
pills (Yearly / Monthly / Lifetime, Lifetime only when the offering has it),
and "Continue with Free" at the end of onboarding. Crew create/join is gated
in the UI only, not in the database **(my call)**.

## Constraints

- **Stack:** Expo / React Native app at `~/Developer/tsumiki`, Supabase,
  RevenueCat. Follow the repo's CLAUDE.md, the theme tokens in
  `src/theme.ts`, and the copy in `src/copy.ts`.
- **App Review:**
  - Restore must stay reachable.
  - No unshipped features on the paywall.
  - Delete account stays reachable.
- **App Store Connect:** new products, a new version, and Submit for Review
  each need Anthony's explicit OK.
- **`GRANDFATHERED_BEFORE`** lives in two places (app and
  `supabase/functions/_shared/access.ts`). Neither moves.

## Open questions (Anthony's to answer, most important first)

1. ~~Limits~~ **Answered 31 Oct: 5 habits and 5 to-dos.**
2. **To-do limit.** Is it 5 *open at once*, or 5 *per day*? Written above
   as open at once.
3. **Calendar on Free.** It's shown during onboarding. After onboarding, do
   Free users lose calendar events, or only after a trial?
4. **Lifetime price.** Is $99.99 OK?

## Left to the builder

- Animations: the block tumble, timeline blocks fading in during onboarding,
  the ✦ new marker.
- Exact wording, within the tone of the mockups.
- Whether onboarding's time wheel is the existing `TimePickerSheet` or a new
  wheel.
- Splitting these parts into releases.
