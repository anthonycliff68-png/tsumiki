# AI Brain Dump, Notes and the New Dock: Implementation Plan

> **For the builder:** run this with superpowers:executing-plans, in this
> session. Anthony's rules override the skill's defaults: **no TDD, no
> subagent-driven development** unless he asks, and **no commit, build,
> migration push, deploy or submit without his explicit OK.** Each task ends
> with a check, then stops for him to look.

**Goal:** Pro users hold to talk, Tsumiki sorts what they said into timeline
items, to-dos, notes and habit ideas, and they add it with one tap after a
short look. Everyone gets Notes, and the app moves to the new dock.

**Architecture:** One new Supabase Edge Function, `brain-dump`, holds the
Anthropic key, checks the session, Pro (via RevenueCat) and a daily cap, and
returns a sorted JSON reply. It writes only the `brain_dumps` row. The app
shows the short look and writes what was ticked through the existing client
paths and RLS. Notes are two new tables and three screens.

**Tech stack:** Expo / React Native / expo-router, TanStack Query, Supabase
(Postgres + RLS, Deno Edge Functions), `npm:@anthropic-ai/sdk`, RevenueCat
REST, `expo-speech-recognition` (the one new dependency, agreed in the design).

**Spec:** `docs/superpowers/specs/2026-10-31-ai-brain-dump-design.md`. Read it
first. Mockups: `.superpowers/brainstorm/87626-1793491863/content/brain-dump-v2.html`.

## Global constraints

- **Wait for the main session.** Start Task 2 only after the Free/Pro work in
  the main app session is committed. Check with `git log --oneline -5` and
  `git status`; both touch `(tabs)/_layout.tsx`, `index.tsx`, `my-day.tsx`,
  `Dock.tsx`. Tasks 1 and 3 touch none of those and can start before.
- The Anthropic key never ships in the app. It's only ever read in the Edge
  Function as `Deno.env.get('ANTHROPIC_API_KEY')`. Claude never types or sets
  keys; Anthony runs `npx supabase secrets set` himself.
- Pro on the server comes from RevenueCat (`REVENUECAT_SECRET_KEY`) or the
  grandfathered / legacy-trial rule in `_shared/access.ts`. Never from
  `profiles.subscribed_until`.
- Model `claude-opus-5-5`, `thinking: {type: "adaptive"}`, effort `low`,
  `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`), structured
  outputs via `output_config.format`, non-streaming, `max_tokens: 16000`.
  Check the SDK call shapes against the claude-api skill's `typescript/` files
  before writing them.
- Daily cap: **30** dumps per user per day.
- All user-facing copy goes in `src/copy.ts`. Gender-neutral copy.
- Don't add "AI Brain Dump" to `copy.paywall.includes` until it ships.
- Tests are `node --test` files next to pure logic (`npm test`), as in
  `src/lib/*.test.ts` and `supabase/functions/_shared/*.test.ts`. Also run
  `npm run typecheck` and `npm run lint` at the end of each task.
- Check on the simulator with `DEVICE="iPhone 17 Pro" scripts/try.sh /route`.
  The main session shares the simulator, so check it's free first.

## Review focus

The cases most likely to bite that the spec implies but no happy path covers:

1. **The network drops after a minute of talking.** The transcript stays on
   screen with "Try again" and nothing is lost (Task 4).
2. **The model returns nothing useful** (empty arrays, or a refusal). The look
   says "Nothing to add" and keeps the words; it doesn't show an empty "Add 0"
   (Tasks 3 and 4).
3. **Someone on Free calls the function directly** with a valid session. They
   get a 402, and no Anthropic call is made (Task 3).
4. **The habit idea is never added unticked**, including when every other row
   is unticked and "Add N" counts only ticked rows (Task 4).
5. **The AI suggests a folder that already exists, in a different case**
   ("roundnet" vs "Roundnet"). It goes into the existing folder, with no
   duplicate and no "new folder" tag (Task 4).

---

### Task 1: Notes data and the Notes screens (free)

**Files:**
- Create: `supabase/migrations/20261031120001_notes_brain_dump.sql`
- Modify: `src/lib/database.types.ts` (add the three tables by hand, in the
  file's existing style)
- Modify: `src/lib/api.ts` (append the notes hooks)
- Create: `src/app/(tabs)/notes.tsx`, `src/app/notes/[folderId].tsx`,
  `src/app/note/[id].tsx`
- Create: `src/components/NoteBody.tsx`
- Modify: `src/app/_layout.tsx` (two `Stack.Screen`s), `src/copy.ts` (a
  `notes` block)

**Interfaces (produces):**
- Tables:
  - `note_folders(id uuid pk default gen_random_uuid(), user_id uuid not null
    references auth.users on delete cascade default auth.uid(), name text not
    null check (char_length(name) between 1 and 40), emoji text, color text not
    null, created_at timestamptz not null default now())`, plus a unique index
    on `(user_id, lower(name))`.
  - `brain_dumps(id, user_id, transcript text not null, created_at)`. RLS:
    select own only, no insert/update/delete policy (the function inserts with
    the service role).
  - `notes(id, user_id, folder_id uuid null references note_folders on delete
    set null, title text not null check 1–120, body text not null default '',
    dump_id uuid null references brain_dumps on delete set null, created_at)`.
  - `profiles.ai_consent_at timestamptz null` (Task 4 sets it, Task 3 checks
    it).
  - RLS is on for all three tables. `note_folders` and `notes` get
    select/insert/update/delete where `user_id = auth.uid()`.
- Types: `NoteFolder = { id; name; emoji: string | null; color: string;
  createdAt: string }` and `Note = { id; folderId: string | null; title; body;
  dumpId: string | null; createdAt: string }`.
- Hooks: `useNoteFolders(userId)`, `useNotes(userId, folderId?: string |
  null)`, `useNote(id)`, `useSaveNote(userId)`, `useCreateFolder(userId)`,
  `useRenameFolder()` and `useDeleteNote()`.
  - `useNotes` without a folder returns all notes, newest first. With `null`,
    it returns Inbox only.
  - `useSaveNote` takes `{id?, title, body, folderId}` and inserts or updates.
    Moving a note is a save with a new `folderId`.
  - `useCreateFolder` takes `{name, emoji?}` and returns `NoteFolder`. It picks
    the next unused `habitColors` colour.
  - `useNoteDump(dumpId)` returns the transcript, for "Your words ›".
- Routes: `/notes` (tab), `/notes/[folderId]` (`inbox` for Inbox) and
  `/note/[id]` (`new`, with optional `?folder=`).

- [ ] **Step 1:** Write the migration, then add the types and hooks.
- [ ] **Step 2:** Build the screens:
  - The Notes tab: a search box that filters titles and bodies on the client,
    a 2-column folder grid with Inbox always first, then "Recent".
  - A folder: notes newest first, under day headers such as "Today · Sat Oct
    31".
  - A note: title, and a body that's editable in place. For dump notes it shows
    "✦ From your brain dump" and a "Your words ›" sheet. There's also a folder
    picker.
- [ ] **Step 3:** `NoteBody` renders `## ` lines as bold headings, `- ` lines
  as bullets, and everything else as text. No Markdown library. Test it in
  `src/lib/noteBody.test.ts` with a pure `parseNoteBody(body): Block[]` in
  `src/lib/noteBody.ts`.
  - `"## Try next\n- toss lower"` gives `[{kind:'heading',text:'Try next'},
    {kind:'bullet',text:'toss lower'}]`.
  - A blank line gives no block.
  - `"#hashtag"` stays text.
- [ ] **Step 4:** Check:
  - `npm test`, `npm run typecheck` and `npm run lint` pass.
  - The migration applies to the local DB, if Anthony has one running.
    Otherwise it's reviewed by eye. No remote push.
  - Until Task 2 adds the tab, reach the Notes screens with
    `scripts/try.sh /notes`.
- [ ] **Step 5:** Stop. Show Anthony, and commit only on his OK.

### Task 2: The new dock, the ＋ blocks and ✦, My Day absorbs Home, You absorbs Progress

Wait for the main session's commit first (Global constraints).

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx`: tabs `my-day`, `notes`, `crews`,
  `you`, in that order. `index` and `progress` are removed as tabs, and the
  default route becomes My Day.
- Delete: `src/app/(tabs)/index.tsx`, after moving what My Day needs.
  `src/components/HabitFan.tsx` is deleted if nothing else uses it.
- Move: `src/app/(tabs)/progress.tsx` → `src/app/progress.tsx`, a pushed
  `Stack.Screen` in `src/app/_layout.tsx`.
- Modify: `src/components/Dock.tsx`:
  - the ＋ takes the check-in orb's place
  - the orb and its pips/now row leave the dock
  - checking in happens on My Day's habit rows, which already exist
- Create: `src/components/PlusBlocks.tsx`: the stack of blocks in today's
  habit colours. A tap tumbles them up into four buttons: Brain dump (Pro),
  Note, Habit and To-do.
- Create: `src/components/SparkleButton.tsx`: the ✦ header button.
- Modify: `src/app/(tabs)/my-day.tsx`, `notes.tsx`, `crews.tsx` and
  `you.tsx`: put ✦ in each header.
- Modify: `src/app/(tabs)/my-day.tsx`:
  - the header shows the date and a "2 of 4 habits done" `ProgressRing`
  - then today's to-dos, then the "Head full?" card (`HeadFullCard`, inline in
    this file), then the timeline
  - a route param `add=todo` focuses the existing add-to-do field
- Modify: `src/app/(tabs)/you.tsx`: a Progress summary card that pushes
  `/progress`.
- Modify: `src/copy.ts` (`dock`, `myDay`, `you`). Grep for
  `router.push('/')`, `'/(tabs)'` and `'/progress'` and fix every caller,
  including deep links and notification routes.

**Interfaces:**
- Consumes: `useIsPro()` and `showUpgrade()` from `src/lib/pro.ts`, the
  `/notes` and `/note/new` routes from Task 1, and `/new-habit` as it is.
- Produces: `openBrainDump(isPro: boolean): void` in `src/lib/pro.ts`. It
  pushes `/brain-dump` when Pro, and otherwise calls `showUpgrade()`. All three
  ways in use it.

- [ ] **Step 1:** Rewire the tabs and routes, and fix every caller the grep
  finds.
- [ ] **Step 2:** Build the dock ＋, `PlusBlocks`, the ✦ button and the
  "Head full?" card, all through `openBrainDump`. Until Task 4 lands,
  `/brain-dump` can be a stub screen.
- [ ] **Step 3:** Move My Day and You as listed above.
- [ ] **Step 4:** Check:
  - `npm test`, `npm run typecheck` and `npm run lint` pass.
  - On the simulator, each tab loads.
  - ＋ opens the four blocks, and each one goes where it should.
  - ✦ on a Free account opens `/plans`. (The main session's `TEMP-SCREENSHOT`
    line in `access.ts` forces locked in dev. If it's still there, say so; it
    isn't this task's to remove.)
  - Checking in from My Day works.
  - You → Progress pushes and comes back.
- [ ] **Step 5:** Stop. Show Anthony, and commit only on his OK.

### Task 3: The `brain-dump` Edge Function

**Files:**
- Create: `supabase/functions/brain-dump/index.ts`
- Create: `supabase/functions/_shared/brainDump.ts` and
  `supabase/functions/_shared/brainDump.test.ts`

**Interfaces (produces):**
- Request: `POST /functions/v1/brain-dump`, with the user's JWT in
  `Authorization`. Body: `{ transcript: string, localNow: string /* "2026-10-31T17:05" */,
  timeZone: string }`. The transcript is 1–8000 characters; longer gets a 400.
- Reply 200: `{ dumpId: string, sorted: Sorted }`.
- `Sorted`:
  - `timeline: {title, day /* YYYY-MM-DD */, time /* HH:MM */ | null, momentId: string | null}[]`
  - `todos: {title, day}[]`
  - `notes: {title, folder, isNewFolder: boolean, emoji: string | null, body}[]`
  - `habits: {name, momentId: string | null, time: string | null}[]`
- Errors: `{ error: 'unauthorized' }` 401, `'not_pro'` 402, `'no_consent'` 403,
  `'daily_cap'` 429, `'bad_input'` 400, and `'sort_failed'` 502 (Anthropic
  error or refusal).
- Pure helpers in `_shared/brainDump.ts`:
  - `DAILY_CAP = 30`
  - `proFromRevenueCat(body: unknown, now: Date): boolean`: true when
    `subscriber.entitlements.pro` exists and its `expires_date` is null or
    later than `now`
  - `SORTED_SCHEMA`: the JSON schema for `Sorted`, with every field required
    and `additionalProperties: false`
  - `buildPrompt(ctx: {transcript, localNow, timeZone, folders: string[],
    moments: {id, label, time}[], habits: string[]}): {system: string, user:
    string}`

**Order inside the handler:**
1. JWT → user via `supabase.auth.getUser()`, else 401.
2. With the service role, read the user's `profiles` row
   (`created_at, trial_started_at, subscribed_until, ai_consent_at`). Null
   consent gives 403.
3. Pro check:
   - `!isLocked(...)` passes only for grandfathered or legacy-trial accounts.
     Mind the semantics: `isLocked` treats `subscribed_until` as access, so
     call it with `subscribedUntil: null`.
   - Otherwise fetch RevenueCat `GET https://api.revenuecat.com/v1/subscribers/{userId}`
     with `Bearer REVENUECAT_SECRET_KEY`, then `proFromRevenueCat`.
   - Not Pro gives 402.
4. Count today's `brain_dumps` rows (UTC day is fine). 30 or more gives 429.
5. Insert the `brain_dumps` row, so the transcript is kept even if sorting
   fails.
6. Read folders, moments (`anchors`) and habit names with the service role,
   filtered by user id.
7. One `messages.create` call. A `stop_reason` of `refusal` or a thrown error
   gives 502. Otherwise parse the text block, and return it with `dumpId`.

- [ ] **Step 1:** In `brainDump.test.ts`, test:
  - `proFromRevenueCat` is true for an active `pro` entitlement, false when
    it's expired, false when there's no `pro` key, and false for junk
    (`null`, `{}`)
  - `buildPrompt` includes every folder name and every moment id, and states
    the local date
- [ ] **Step 2:** Write the helpers and the handler. Use the claude-api skill
  to confirm the SDK call shape and the fallbacks beta, without guessing. The
  prompt says:
  - notes come out Granola-style, with a short title, `## ` headings and `- `
    bullets, in the user's own wording
  - reuse an existing folder when one fits (`isNewFolder: false`)
  - split two topics into two notes
  - `day` defaults to `localNow`'s date
  - an item said against a moment gets that `momentId`
  - never suggest a habit whose name matches an existing one
- [ ] **Step 3:** Check:
  - `npm test` passes.
  - `deno check supabase/functions/brain-dump/index.ts`, if Deno is installed.
  - `npx supabase functions serve brain-dump` runs locally **only if** Anthony
    has put keys in a local `.env` himself. Otherwise it's reviewed by eye. No
    deploy.
- [ ] **Step 4:** Stop. Show Anthony, and commit only on his OK.

### Task 4: The brain dump screen in the app

**Files:**
- Modify: `package.json`, by adding `expo-speech-recognition` with
  `npx expo install`. In `app.json` `plugins`, add it with
  `microphonePermission` and `speechRecognitionPermission` strings:
  - "Tsumiki listens while you hold the mic so you can talk instead of type."
  - "Your words are turned into text on your iPhone."
- Create: `src/app/brain-dump.tsx` (a modal `Stack.Screen`), replacing Task
  2's stub.
- Create: `src/lib/brainDump.ts` and `src/lib/brainDump.test.ts`
- Modify: `src/lib/api.ts`: `useSortDump()` and `useAddFromDump(userId)`
- Modify: `src/copy.ts` (a `brainDump` block), `src/app/(tabs)/my-day.tsx`
  (the "✦ new" mark and the folders toast)

**Interfaces:**
- Consumes:
  - from Task 3: `Sorted` (copy the type into `src/lib/brainDump.ts`, since
    the app can't import from `supabase/`) and the error codes
  - from Task 1: `useCreateFolder` and the `notes` table
  - from `api.ts`: `useCreateHabit` (`HabitInput`)
- Produces, in `src/lib/brainDump.ts`:
  - `type LookRow = { key: string; kind: 'timeline' | 'todo' | 'note' | 'habit';
    ticked: boolean; title: string; day: string; time: string | null;
    momentId: string | null; folder?: string; isNewFolder?: boolean;
    emoji?: string | null; body?: string }`
  - `toLookRows(sorted: Sorted, folders: NoteFolder[]): LookRow[]`. Every row
    is ticked except habits. A folder that matches an existing one
    case-insensitively becomes that folder's exact name, with
    `isNewFolder: false`.
  - `tickedCount(rows: LookRow[]): number`
  - `freshIds: Set<string>`: a module-level set, so "✦ new" lasts until the
    app restarts
- `useSortDump()` is a mutation calling `supabase.functions.invoke('brain-dump')`
  that returns `{dumpId, sorted}` or throws with the error code.
- `useAddFromDump(userId)` is a mutation over
  `({rows, dumpId}) => Promise<{folders: string[]}>`:
  1. create the missing folders
  2. one insert for todos: timeline rows get `moment_mode: 'after'` with
     `anchor_id` when there's a `momentId`, else `'at'` with `at_time`; todo
     rows get `'any'`
  3. one insert for notes, with `dump_id`
  4. `useCreateHabit` for each ticked habit: mode `'after'` or `'at'`, every
     day, next unused colour
  5. add the new ids to `freshIds`, invalidate the todos, notes and habits
     queries, and return the folder names for the toast

**Screen states:** consent → catch → sorting → look → adding → `router.replace('/my-day?dumped=Roundnet,Inbox')`.
- **Consent:** shown when `profiles.ai_consent_at` is null. It explains that
  the words go to Anthropic to be sorted. "Agree" sets `ai_consent_at = now()`
  on the user's own profile row, and "Not now" closes the screen.
- **Catch:** the big mic, with a live transcript while held, and a release
  that sorts. "Type instead" shows a text box and "Sort it". If speech
  permission is denied, it goes straight to typing.
- **Sorting:** shows "Sorting…" with the transcript still visible.
- **On error:** the transcript stays, with "Try again" (no automatic retry).
  - 429 shows the cap message.
  - 402 calls `showUpgrade()`.
- **Look:**
  - groups Timeline, To-dos, Notes and Habit idea
  - a tick toggles a row, and a tap edits its title, time, day or folder
  - rows not on today show the short day ("Thu")
  - the "new folder" tag
  - the button reads **Add N**, and is disabled at 0
  - with zero rows, it shows "Nothing to add" and keeps the words

- [ ] **Step 1:** Test in `brainDump.test.ts`:
  - `toLookRows` leaves habits unticked and ticks everything else
  - `tickedCount` ignores unticked rows
  - folder `"roundnet"` with an existing `"Roundnet"` gives
    `folder === 'Roundnet'` and `isNewFolder === false`
  - an empty `Sorted` gives `[]`
- [ ] **Step 2:** Write `brainDump.ts`, the two hooks and the screen. Use the
  mockup v2 screens 2–4 for layout.
- [ ] **Step 3:** On My Day, show "✦ new" on items in `freshIds`, and a
  one-line toast from the `dumped` param. There's no toast component in the
  repo, so use a small `Reveal`-animated line that fades after 3 seconds.
- [ ] **Step 4:** Check:
  - `npm test`, `npm run typecheck` and `npm run lint` pass.
  - The speech module is native, so the simulator needs a dev build:
    `npx expo run:ios`, **after Anthony's OK**, since it's a build.
  - Until the function is deployed, check the look and the add with a
    dev-only fake reply (a `__DEV__` branch in `useSortDump` keyed on the
    transcript `"fake"`). Remove it before committing.
- [ ] **Step 5:** Stop. Show Anthony, and commit only on his OK.

### Task 5: Going live (each step needs Anthony's yes)

1. **Anthony** creates the Anthropic key with a monthly spend limit, and the
   RevenueCat secret key, then runs
   `npx supabase secrets set ANTHROPIC_API_KEY=… REVENUECAT_SECRET_KEY=…`.
2. On his OK: `npx supabase db push`, then
   `npx supabase functions deploy brain-dump`.
3. One real dump from his Pro account and one from a Free test account (402).
   Confirm the cost line in the Anthropic Console.
4. Privacy:
   - I draft the privacy-policy line ("When you use Brain Dump, what you say
     is sent to Anthropic to be sorted, and isn't used to train models")
   - Anthony updates the policy page and the App Store privacy label
5. On his OK: version bump, EAS build, TestFlight. He runs his full test, and
   we tweak.
6. Once it ships: add `'AI Brain Dump'` to `copy.paywall.includes` in
   `src/copy.ts`.
7. Update `HANDOFF.md` (both copies) and the Notion Do item.
