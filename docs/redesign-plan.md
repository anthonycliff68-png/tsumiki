# Next build: Home, My Day, to-dos and calendar

Status, 24 Oct 2026: designed and tried as a mockup on the simulator. Nothing is built into the real app or shipped yet.

**In one line:** Tsumiki goes from a habit tracker to a day planner. Your habits, your to-dos and your calendar sit on one timeline, and you can still do the habits with your crew.

---

## Feature list

### 1. Home (replaces Today)
- "Welcome, {first name}" at the top, with two round buttons: notifications (bell) and My Day (calendar).
- **Today's to-dos come first.**
  - Tap the circle to tick one off.
  - Tap the words to edit them inline, with ✓ to save and × to delete.
  - Type in the box and press ✓ to add one.
  - Unfinished to-dos from earlier days carry over with a "From yesterday" tag.
- **"Your habits"**, the same habit cards, now in a straight overlapping row instead of a fanned hand.
  - Tap the card to check in. There's no separate Check in button.
  - The habit's name is centred on the card with "Every day" under it.
  - The heading is centred and bigger, and the "8 of 12" counter is bolder.
- **Progress card last:**
  - A big percentage for today.
  - Week and month figures.
  - Three activity rings: today, this week and this month.
  - Tap it to open Progress.
- Gone from the old Today: the big date, the "0/12 done" count and the caption under the fanned hand.

### 2. My Day
- A new header: round buttons, a centred title, the month, and a Mon–Sun strip you tap to change day.
- **"Anytime today" at the top:** to-dos with no time, then habits with no time.
- **Compact hour rows.** Each hour shows its anchor (Wake up, Lunch…), that hour's habits as two-line cards, its calendar events, and its to-dos.
- **Check-in animation:** the card fills with water in the habit's colour.
- **Uncheck animation (the "drain"):** the strike-through pulls back, the row grows back into a full colour card, and the colour drains out of the bottom.

### 2b. Dragging (kept)
- Long-press a habit or a to-do to pick it up, then drop it on an hour or an anchor.
- A drop on an anchor makes the item "after {anchor}". A drop on an hour sets that time.
- The change saves straight away. Its reminder moves with it, and everything around it animates out of the way.
- Calendar events can't be dragged, because they're read-only.

### 3. Day, Week and Month views (in My Day)
- **Day:** the timeline above.
- **Week:** one card per day. Each card has a bar for how many habits were finished that day, plus that day's events. Today is outlined and shows how many to-dos are left. Tap a day to open it.
- **Month:** a grid with a ring on each day for habits done, and dots for events. There's a colour key, and the selected day's events show below. The back arrow steps a week or month at a time.

### 4. Calendar connection (read-only)
- One permission prompt: "Allow Tsumiki to access your calendar."
- It reads every calendar on the phone: iCloud, Google/Gmail, Outlook and work accounts. On Android it reads Google calendars.
- Events show in the hour rows and in the Week and Month views, colour-coded by calendar.
- Changes made in Apple Calendar or Google Calendar show up the next time Tsumiki opens. Google changes can take about 15 minutes to reach the phone first.
- A "Calendars" screen under You turns each calendar on or off.
- **Read only:** events can't be edited from Tsumiki. Editing can come later as an over-the-air update.
- Events are read on the phone and never sent to our server. Crews never see your calendar.
- If Gmail isn't added to the iPhone's calendar accounts, the app shows a tip on how to add it. We won't do a separate "Sign in with Google".

---

## What's different from the app today

| Area | Now | Next build |
|---|---|---|
| First tab | **Today**: big date, done count, fanned hand of habits | **Home**: to-dos, then a straight row of habits, then progress |
| Checking in on Home | Check in button under the hand | Tap the card |
| To-dos | None (tried in Oct, removed on 19 Oct) | On Home and My Day, with carry-over |
| My Day | Full hour grid, habits only, drag a habit to move it | Compact hour rows with habits, to-dos and calendar events; anytime items at the top |
| Views | Today only | Day / Week / Month |
| Calendar | None | Reads iCloud and Google calendars |
| Uncheck | Card returns | "Drain" animation |
| Fan undo | Cards jump sideways, then back | Cards glide back into place (this fix also helps the current Today) |

**Unchanged:** crews, the group streak, nudges, invites, reminders, the Progress tab, the paywall, the mountain background and the glass cards.

---

## How it affects the app

- **Data:** one new database table, `todos`, the same shape as the October one.
  - Columns: title, the day it was written for, the day it was done, and an optional anchor or time.
  - Only the owner can read or write their own to-dos.
  - Carry-over is worked out when the app asks for to-dos, so there's no nightly job.
- **Release, in two parts:**
  1. **Home, My Day, to-dos and the Day/Week/Month views.** All JavaScript plus a database migration, so this ships as an **over-the-air update** with no App Store review.
  2. **Calendar.** Needs `expo-calendar`, so this means **one new app build** and App Store review (usually 1–2 days). It's the only native change, so any other native work should go into the same build.
- **Kept:** drag-to-move on My Day, now for to-dos as well as habits.
- **Lost:** the big date and "up next" card from Today.

---

## Code changes (short version)

| Change | Files |
|---|---|
| Home screen replaces Today | `src/app/(tabs)/index.tsx` (rewritten from `src/mock/HomeMock.tsx`) |
| New My Day | `src/app/(tabs)/my-day.tsx` (from `src/mock/DayMock.tsx`) |
| Day/Week/Month, event cards | new `src/components/` files (from `src/mock/calendar.tsx`) |
| To-dos | new migration `supabase/migrations/…_todos.sql`, hooks in `src/lib/api.ts`, row component (from `src/mock/parts.tsx`, `todos.ts`) |
| Straight habit row + glide fix | `src/components/HabitFan.tsx`: a `variant="home"` option (already written), with Today's default unchanged |
| Tab name and wording | `src/copy.ts`: "Today" becomes "Home", plus the new to-do and calendar copy |
| Calendar (part 2) | add `expo-calendar`, permission text in `app.json`, a new `src/lib/calendar.ts`, and a Calendars screen under You |
| Clean-up | delete `src/mock/` and the temporary paywall bypass |

Two fixes from the mockup carry over:
- Never animate height and scale on the same view. That's what crashed the first mockup.
- Build the animation pieces once, not on every redraw. That's what broke undo on My Day.

---

## Why it's more productive and organised

- **One place for the whole day.** You no longer check a calendar app, a to-do app and Tsumiki separately: meetings, errands and habits sit together, hour by hour.
- **Habits sit inside real life.** "After lunch → 15 min walk" now appears right next to the actual lunch with Sam, so it's obvious where the habit fits.
- **To-dos can't slip.** An unfinished to-do follows you to the next day and is tagged until it's done or deleted.
- **Anything without a time stays visible.** Anytime to-dos and habits sit at the top of My Day instead of hiding at the bottom.
- **Fewer taps.** Tap the card to check in, tap a to-do's text to edit it, and add a to-do in one line on Home.
- **Zoom out to plan.** Week shows which days are packed and how consistent you were. Month shows your habit streak at a glance.
- **Progress without a separate trip.** Today, week and month rings are on Home.

---

## Still to decide
1. Which tab comes first, Home or My Day?
2. Are to-dos personal only, or can a crew share them?
3. How long do to-dos carry over? The October version kept them until done.
4. Can to-dos be edited on My Day too, or only on Home?
5. Confirm adding `expo-calendar` (read-only agreed 24 Oct) when we reach part 2.

**Parked for later:** daily, weekly and monthly goals; editing calendar events from Tsumiki.
