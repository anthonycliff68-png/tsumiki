# New Onboarding Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans (native, in one session). Anthony's rules: no TDD, no subagent-driven dev, simplest version that works. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace today's setup (profile → routine → first habit → crew) with the one-question-per-page flow from the design: Welcome → Wake + bed → Moments → First habit → Calendar → To-dos → Pro, then My Day with a first-time tip.

**Decided by Anthony (Oct 31):**
- The Calendar page is in. The app reads the phone's calendar with Apple's permission, read-only.
- Calendar events are **Pro only** after onboarding. During onboarding everyone sees them in the preview.
- There is no "Here's your day" page. After Build my day the paywall opens, and "Continue with Free" lands on My Day.
- My Day gets a dismissible first-time tip at the top: press and hold a habit, moment or to-do to move it.
- Moment emoji show everywhere, not just in onboarding.

**Architecture:** The Welcome page replaces the pre-sign-in carousel. After sign-in, the tabs layout sends anyone with no moments to one new screen, `(onboarding)/setup.tsx`. It holds every answer in local state and shows one page at a time; Back goes back a page. "Build my day" saves everything in one go (moments → habit → to-dos), then opens the real My Day with a one-time tip and a "Looks good" button that opens the paywall (`/plans?first=1`). Profile and Crew leave onboarding. A missing name is asked for the first time someone starts or joins a crew.

**Tech Stack:** Expo / React Native, expo-router, Supabase (existing `useSaveRoutine`, `useCreateFirstHabit`, `useTodoActions`), `@react-native-community/datetimepicker` (spinner).

**Spec:** `docs/superpowers/specs/2026-10-31-free-pro-and-new-app-shape-design.md`, Part 2 (and Part 3's "Profile and the crew prompt leave onboarding"). Visual reference: `.superpowers/brainstorm/70524-1793456315/content/all-screens-v7.html`, pages 1–8.

## Global Constraints

- Follow the theme tokens in `src/theme.ts` and put all copy in `src/copy.ts` (`copy.onboarding.setup.*`). Big Archivo headline via `Display`, one control, very little text.
- Calendar is read-only, and its events show only when `useIsPro()` is true (onboarding preview excepted). Adding `expo-calendar` needs a fresh dev build and `NSCalendarsFullAccessUsageDescription` in `app.json`.
- Free limits still apply: the first habit counts as 1 of 5 and the to-dos count toward the 5 open.
- Restore and Delete account stay reachable (App Review). The paywall at the end keeps "Continue with Free".
- Don't commit, build or submit without Anthony's OK. Commit steps below wait for that.

## Review Focus

1. **Signing in again with a routine already set up** must never show setup again or save a second copy of the moments. The tabs only redirect when there are no moments, and `useSaveRoutine` upserts.
2. **Bed earlier than wake** (night shift, e.g. wake 20:00, bed 08:00). Guessed moment times must still land between the two, wrapping past midnight, and never fall outside the day. This is tested in Task 1.
3. **Unticking every moment** leaves just Wake up and Bed. The first habit then falls back to "after Wake up" instead of disappearing (Task 1 test).
4. **A save that fails halfway** (moments saved, habit failed). An error shows on the To-dos page and "Build my day" can be pressed again. Moments are upserted, so a retry doesn't duplicate them.
5. **Blank to-do lines and a blank "write my own" habit** are dropped, never saved as empty rows.

---

### Task 1: The day logic (pure, tested)

**Files:**
- Create: `src/lib/onboardingDay.ts` (no `@/` imports; `node --test` can't resolve the alias)
- Create: `src/lib/onboardingDay.test.ts`

**Interfaces — Produces:**
- `type MomentKey = 'coffee' | 'lunch' | 'gym' | 'home' | 'dinner'`
- `MOMENT_CHOICES: { key: MomentKey; label: string; emoji: string }[]`: Coffee ☕, Lunch 🥪, Gym 🏋️, Get home 🏠, Dinner 🍝. Picked by default: coffee, lunch, home.
- `guessTime(key: MomentKey, wake: string, bed: string): string`: "HH:MM". Coffee = wake + 30 min; Lunch 12:30; Gym 18:00; Get home 18:00; Dinner 19:00. Any guess outside wake→bed (wrapping midnight) is clamped to wake + 1h for coffee and to bed − 1h for the rest.
- `type DayMoment = { key: string; label: string; emoji: string; time: string }`
- `buildDay(wake: string, bed: string, picked: MomentKey[], own: string[]): DayMoment[]`: Wake up 🌅 and Bed 🌙 always included, own moments get ✨ and 12:00, sorted by time from wake.
- `HABIT_CHOICES: { id: string; name: string; emoji: string; after: string }[]`: Read 10 pages 📖 after coffee; 15 min walk 🚶 after lunch; Glass of water 💧 after wake. Colours are set in Task 3 from `habitColors` (2, 0, 3).
- `momentFor(after: string, day: DayMoment[]): DayMoment`: the moment with that key, or Wake up.

- [ ] **Step 1: Write `onboardingDay.test.ts` with these assertions**

```ts
assert.equal(guessTime('coffee', '07:00', '23:00'), '07:30');
assert.equal(guessTime('lunch', '07:00', '23:00'), '12:30');
assert.equal(guessTime('dinner', '06:00', '18:30'), '17:30'); // clamped to bed − 1h
assert.equal(guessTime('lunch', '20:00', '08:00'), '07:00');  // night shift: wraps, clamped
assert.deepEqual(buildDay('07:00', '23:00', [], []).map((m) => m.key), ['wake', 'bed']);
assert.deepEqual(buildDay('07:00', '23:00', ['lunch', 'coffee'], []).map((m) => m.key), ['wake', 'coffee', 'lunch', 'bed']);
assert.equal(momentFor('lunch', buildDay('07:00', '23:00', [], [])).key, 'wake');
assert.equal(buildDay('07:00', '23:00', [], ['  ']).length, 2); // blank own moment dropped
```

- [ ] **Step 2: Implement `src/lib/onboardingDay.ts`.** Do the time maths in minutes from wake, mod 1440.
- [ ] **Step 3: Run `npm test`.** Expected: all pass, including the new file.

### Task 2: Welcome page (replaces the carousel)

**Files:**
- Create: `src/components/WelcomePage.tsx`
- Modify: `src/app/(auth)/welcome.tsx`: render `<WelcomePage onStart={done} />` instead of `<Welcome>`
- Delete: `src/components/Welcome.tsx`. Keep `WelcomeScreens.tsx`, which `CardCollage` (sign-in) still uses.

**Interfaces — Produces:** `WelcomePage({ onStart }: { onStart: () => void })`

- [ ] **Step 1: Build `WelcomePage`.**
  - Background: `assets/backdrop.jpg`, full bleed, with the same dark gradient as the Paywall.
  - Text: headline `Plan your day.\nClear your head.` (`Display` 54) and the blurb `Your habits, to-dos and calendar on one timeline. Let's build today together.`
  - Buttons: PrimaryButton **Let's build my day** → `onStart`, and TextButton **I have an invite link**.
  - The invite button reveals one field, "Paste your invite link". On submit, take the last path segment of `/j/<code>` (or the raw text) and `router.push({ pathname: '/j/[code]', params: { code } })`. That screen already remembers the code through sign-in.
- [ ] **Step 2: Check it in the simulator.** Sign out and clear the `tsumiki.welcome.seen` key: delete and reinstall the dev app, or run `xcrun simctl uninstall booted com.tsumiki.app` then rebuild. The new page shows. "Let's build my day" opens sign-in.

### Task 3: The setup screen (pages 2–6)

**Files:**
- Create: `src/app/(onboarding)/setup.tsx`
- Create: `src/components/DayPreview.tsx`: the "Your day" mini timeline at the bottom of each page
- Modify: `src/components/OnboardingHeader.tsx`: dots become a thin progress bar, `step`/`total` are optional (no bar when left out)
- Modify: `src/copy.ts`: add `copy.onboarding.setup` (all strings below); remove the routine/habit/crew strings only once Task 5 deletes their screens

**Interfaces:**
- Consumes: Task 1's exports; `useSaveRoutine`, `useCreateFirstHabit`, `useTodoActions(userId).add(title)` from `src/lib/api.ts`
- Produces: route `/setup`. On success it calls `router.replace({ pathname: '/plans', params: { first: '1', then: '/my-day' } })`.
- `DayPreview({ day, habit }: { day: DayMoment[]; habit?: { name: string; emoji: string; color: string; after: string } })`

**Page state** (all in `setup.tsx`): `page: 0..3`, `wake = '07:00'`, `bed = '23:00'`, `picked: MomentKey[] = ['coffee','lunch','home']`, `own: string[]`, `habitId: string = 'read'`, `ownHabit: string`, `todos: string[] = ['']`.

- [ ] **Step 1: Page 0, Wake + bed.**
  - Eyebrow **Your day**, title **When does your day start and end?**
  - Two inline `DateTimePicker`s (`display="spinner"`, `mode="time"`) side by side, labelled Wake up / Bed.
  - Button **Next**.
- [ ] **Step 2: Page 1, Moments.**
  - Eyebrow **Your moments**, title **What already happens every day?**, blurb **Tap the ones you do. Your habits will hang off these.**
  - Toggle chips from `MOMENT_CHOICES`, plus a ＋ chip that adds a text field for your own moment.
  - Button **Next**.
- [ ] **Step 3: Page 2, First habit.**
  - Eyebrow **Your first habit**, title **What do you want to start?**
  - Three cards from `HABIT_CHOICES`, each showing "after {momentFor(...).label}". The selected card is filled with its colour plus a ✓, like the current habit screen.
  - **＋ Write my own** shows a name field. It hangs off Wake up and uses `habitColors[1]`.
  - Button **Next**.
- [ ] **Step 4: Page 3, To-dos.**
  - Eyebrow **Today's to-dos**, title **Anything to get done today?**, blurb **One line each. They stay until they're done.**
  - Checkbox-style rows, each a TextInput. Return adds the next row; **Add another** adds one too.
  - Button **Build my day**, plus a TextButton **Skip** that saves with no to-dos.
- [ ] **Step 5: Header and preview on every page.**
  - `OnboardingHeader` with `step={page + 1} total={5}`. Back is hidden on page 0 and goes to `page - 1` otherwise.
  - `<DayPreview>` sits under the controls.
  - `<Bleed>` uses the selected habit's colour.
- [ ] **Step 6: Implement `build()`.**
  1. Save the moments: `useSaveRoutine.mutateAsync(buildDay(...).map(m => ({ label: m.label, usualTime: m.time, isDefault: m.key in seeds })))`.
  2. Find the habit's moment in the returned rows by label. Call `useCreateFirstHabit.mutateAsync({ name, color, anchorId })`. Skip this if the own-habit name is blank.
  3. Add each non-blank to-do with `add(title)`.
  4. `router.replace({ pathname: '/plans', params: { first: '1', then: '/my-day' } })`.

  On error, show `messageFrom(e, copy.onboarding.setup.failed)` above the button and stay on the page. The `mutateAsync` from step 1 returns only *new* rows (`ignoreDuplicates`), so for a retry re-read the anchors with `queryClient.fetchQuery` before matching the label.
- [ ] **Step 7: Run `npx tsc --noEmit` and `npx eslint src/app/(onboarding)/setup.tsx src/components/DayPreview.tsx src/components/OnboardingHeader.tsx`.** Expected: clean.

### Task 4: Calendar page, events on My Day (Pro), the first-time tip, and moment emoji

**Files:**
- Add a dependency: `npx expo install expo-calendar`. Add the plugin with `calendarPermission` text to `app.json`, then rebuild the dev client.
- Create: `src/lib/calendar.ts`, with `useTodayEvents(enabled: boolean): { title: string; start: string; end: string }[]`. It reads today's events from every calendar the user allowed and returns them as "HH:MM", all-day events left out.
- Modify: `src/app/(onboarding)/setup.tsx`. Add a Calendar page between First habit and To-dos.
  - Eyebrow **Your calendar**, title **Bring in your plans?**, blurb **Meetings and appointments show on your timeline. Tsumiki only reads them.**
  - Toggle **📅 Show calendar events**. Turning it on calls `Calendar.requestCalendarPermissionsAsync()`.
  - Buttons **Next** and **Not now**. While the toggle is on, `DayPreview` shows today's events.
  - Total pages becomes 6.
- Modify: `src/app/(tabs)/my-day.tsx`.
  - Calendar events: if `useIsPro()` and permission is granted, events become blue-barred cards (`#4A7FD4`) on the Day timeline at their time. They are never editable or draggable.
  - The tip: `<FirstTimeHint id="myday-move">` at the top, with **Press and hold a habit, moment or to-do to move it. Swipe left or right for Day, Week and Month.**
  - Swipe: a horizontal swipe on My Day moves between Day, Week and Month, the same as tapping `ViewSwitch` (Anthony, Oct 31).
- Modify: `src/lib/onboardingDay.ts`, adding `emojiFor(label: string): string`. It matches known labels case-insensitively (Wake up 🌅, Coffee ☕, Lunch 🥪, Gym 🏋️, Get home 🏠, Dinner 🍝, Bed 🌙, Work 💼, Walk the dog 🐕, School run 🎒) and falls back to ✨. My Day's moment rows show it before the label. Assert `emojiFor('lunch') === '🥪'` and `emojiFor('Band practice') === '✨'` in the Task 1 test file.

- [ ] **Step 1: Make the changes above.** Run `npx tsc --noEmit` and `npm test`.
- [ ] **Step 2: Check in the simulator on a fresh build.**
  - The permission popup appears.
  - Events show on My Day with Pro and are hidden on Free.
  - The tip shows once and stays gone after it's dismissed.

### Task 5: Reroute and retire the old steps

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx`: `settingUp` redirects to `/setup`. Drop the `unnamed` → `/profile` redirect.
- Modify: `src/app/(onboarding)/profile.tsx`:
  - Read the `from` param. With `from=crew`, call `goBack()` after saving instead of `/routine`/`/`.
  - Drop `step={1}`, so there's no progress bar.
- Modify: `src/app/(tabs)/crews.tsx` (both "Start a crew" buttons) and `src/app/j/[code].tsx` (`join`):
  - If `profile.display_name.trim() === ''`, call `router.push({ pathname: '/profile', params: { from: 'crew' } })` first.
  - Use the existing `useMyProfile(userId)` for this.
- Delete: `src/app/(onboarding)/routine.tsx`, `habit.tsx`, `crew.tsx`, plus their now-unused copy and defaults (`EXTRA_ANCHORS`, `HABIT_SUGGESTIONS` if nothing else imports them; check with grep).

- [ ] **Step 1: Make the changes above.**
- [ ] **Step 2: Run `npx tsc --noEmit`, `npm test` and `npx eslint src`.** Expected: clean.
- [ ] **Step 3: Full simulator run on a fresh account:** Welcome → sign in → 5 setup pages → paywall → Continue with Free → My Day with the tip.
  - Then sign out and back in: setup must **not** show again.
  - Then start a crew with a blank name: the name screen shows first.
- [ ] **Step 4: Update HANDOFF.md.** With Anthony's OK, commit: `feat: new one-question onboarding`.

## Left to the builder

- Spacing and the exact look of the progress bar and chips: match the mockup.
- The stagger and animation between pages: none needed for v1.
