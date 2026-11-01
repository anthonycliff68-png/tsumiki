# AI Brain Dump (Pro) and Notes

Design written 31 Oct 2026 from a brainstorm with Anthony. It replaces Parts 6
and 7 of `2026-10-31-free-pro-and-new-app-shape-design.md` where they differ.
Mockups: `.superpowers/brainstorm/87626-1793491863/content/brain-dump-v2.html`
(gitignored, local only).

Lines marked **(my call)** were decided by Claude, not Anthony. He should check
them.

## Why

Anthony wants to talk into the app and have it do the filing for him, without
touching My Day or Notes himself. Most of what he dumps is **notes**: ideas,
tips to himself (for example a roundnet technique to try) and plans for his
apps. To-dos come next, and timed things and new habits come up less often.
Notes should come back written up the way Granola writes up a meeting: a clean
title, short headings and bullets.

It's a Pro feature and one of the reasons to upgrade.

## What it does

1. **Way in.** There are three ways to open it, all from the new dock layout:
   - the "Head full?" card on My Day
   - the ✦ button on every tab's header
   - Brain dump in the ＋ blocks

   On Free, each of these opens the paywall (`showUpgrade()`).
2. **Catch.** A big mic button: hold to talk, and your words show up live; let
   go to sort. "Type instead" opens a text box with a "Sort it" button.
3. **Sorting.** A second or two with a "Sorting…" state.
4. **Short look** ("What I heard"), grouped as:
   - **Timeline:** anything with a time ("call mum at 5") becomes a to-do at
     that time.
   - **To-dos:** go to today's anytime list.
   - **Notes:** each has a title, a one-line preview and its folder. A folder
     the AI made up shows a "new folder" tag.
   - **Habit idea:** unticked by default. It is only added if the user ticks
     it.

   Every other row starts ticked. Untick a row to drop it, or tap it to fix the
   wording, time or folder. The button reads **Add N**, where N counts the
   ticked rows.
5. **Done.** The user lands on My Day:
   - new items are marked "✦ new" until the app restarts **(my call)**
   - a toast says which folders the notes went into
   - everything drags like any other item

## Notes (free for everyone)

Notes don't exist in the app yet, and the brain dump is mostly useless
without them, so they ship together.

- **Notes tab:**
  - search
  - folders in a 2-column grid, coloured from `habitColors`, with **Inbox**
    always present
  - "Recent" below the grid
- **A folder:** notes newest first, grouped under day headers ("Today · Sat Oct
  31"). There is no hour timeline and there are no tags. Each note is dated
  automatically.
- **A note:**
  - a title and a body
  - the body is plain text, but AI notes use short headings and bullets, so
    the body is simple Markdown rendered with bold headings and bullets
    **(my call)**
  - Edit
  - notes made by a dump show "✦ From your brain dump" and **Your words ›**,
    which opens exactly what was said **(my call, from Granola's transcript)**
- **Free users** write notes and pick a folder themselves. Making folders,
  renaming them and moving notes is free.
- **Folders made by the AI:** it uses an existing folder when one fits, and
  creates a new one when nothing does **(my call)**. A dump that covers two
  topics becomes two notes **(my call)**.

## Also built here: the new app layout

Anthony decided on 31 Oct that this project builds Part 3 of the parent design
too, because every way into the brain dump lives there.

- **Dock:** My Day · Notes · **＋** · Crews · You. The ＋ replaces the check-in
  orb, and checking in moves to My Day.
- **＋ blocks:** a stack of blocks in today's habit colours. Tapping it tumbles
  them up into four buttons:
  - Brain dump (Pro)
  - Note
  - Habit (opens `new-habit`)
  - To-do
- **✦ on every tab's header:** opens the brain dump, or the paywall on Free.
- **My Day absorbs Home:**
  - the header has the date and a "2 of 4 habits done" ring
  - then today's to-dos, the "Head full?" card, then the timeline
  - `HabitFan` is removed, and the Home tab goes
- **You absorbs Progress:** a Progress summary card on You opens the existing
  Progress screen as a pushed page **(my call: reuse the screen, don't rebuild
  it)**.
- **Out of scope here:** drag-to-move moments and the tap-to-edit sheets
  (Part 4), the new onboarding (Part 2), and calendar (Part 5).

**Wait for the main session.** Building starts after the Free/Pro work in the
main app session is committed. Both touch `_layout.tsx`, `index.tsx`,
`my-day.tsx` and `Dock.tsx`.

## Goals

- One hold-to-talk, one look, one tap, and the day and notes are updated.
- Notes read like a clean Granola write-up, not a transcript.
- Free users get a real Notes app. Only the AI sorting is Pro.

## Non-goals

- Chatting with the AI, or asking it questions about your notes.
- Editing or moving things that already exist. A dump only adds.
- Calendar events. Timed items are to-dos with a time, which already exist.
- Sorting with the AI on Free, even with a small allowance.

## Anti-goals (would count as failure even if it works)

- The API key ships inside the app, or the Pro check can be faked from the
  app.
- A habit gets created without the user ticking it.
- Something gets added without the short look.
- A dump is lost: talking for a minute and then losing it to a network error.
- The paywall lists AI Brain Dump before it's actually in the build.

## How it's built

**Voice.** Use `expo-speech-recognition`, Apple's speech engine running
on-device.
- Anthony agreed to the hold-to-talk button over the keyboard mic. This is the
  one new dependency.
- It needs microphone and speech-recognition permission strings in `app.json`.
- It's native, so it ships in the next App Store build rather than over the
  air.
- If permission is denied, fall back to "Type instead".

**Sorting runs on the server.** A new Supabase Edge Function, `brain-dump`:
1. **Checks the caller.** It reads the user from the request's JWT and rejects
   anyone who isn't signed in.
2. **Checks Pro on the server.** It can't trust `profiles.subscribed_until`,
   because the app writes that column itself. Instead it allows the request
   when any of these holds:
   - RevenueCat's REST API (`GET /v1/subscribers/{user id}`, secret key
     `REVENUECAT_SECRET_KEY`) shows the `pro` entitlement active
   - the account is grandfathered or inside a legacy trial, read from
     `profiles` with the service role, using the rule in
     `_shared/access.ts`
3. **Caps usage.** Each dump writes a row to a new `brain_dumps` table (user,
   transcript, created_at). The function refuses after **30 dumps a day** per
   user **(my call: a cost guard, not a product limit)**.
4. **Calls Claude** with the official SDK (`npm:@anthropic-ai/sdk`) and the
   secret `ANTHROPIC_API_KEY`:
   - model `claude-opus-5-5`, with adaptive thinking at effort `low` (it's a
     short sorting job, so speed matters)
   - `fallbacks: "default"`
   - structured outputs (`output_config.format`) with a JSON schema, so the
     reply always parses
5. **Gives the model:**
   - the transcript
   - the user's local date, time and time zone
   - their folder names
   - their moments with times
   - their current habit names, so it doesn't suggest one they already have
6. **Gets back:**
   - `timeline[{title, day, time, momentId?}]`
   - `todos[{title, day}]`
   - `notes[{title, folder, isNewFolder, body}]`
   - `habits[{name, momentId? or time}]`

   It returns this to the app with the `brain_dumps` id.

   How the app reads the reply:
   - **Day.** `day` defaults to today. "Buy milk tomorrow" or "dentist
     Thursday at 3" lands on that day, and its row in the short look shows the
     day ("Thu") **(my call)**.
   - **Moments.** A timed item said against a moment ("after breakfast,
     stretch") attaches to it (`moment_mode='after'`, `anchor_id`). Otherwise
     it gets a clock time **(my call)**.
   - **Habits.** A habit idea is stacked on a moment or set at a time,
     whichever the user said. It defaults to every day, solo, and the next
     unused colour **(my call)**.

**The app writes what the user approved,** with the existing client paths and
RLS:
- to-dos through the `todos` table (timed ones use `moment_mode='at'` and
  `at_time`)
- habits through `useCreateHabit`
- notes and new folders into the new tables

The server never writes anything into My Day. That's what keeps "nothing added
without the short look" true.

**New tables** (one migration, RLS on, each row owned by its user):
- `note_folders`: id, user_id, name, emoji, color, created_at
- `notes`: id, user_id, folder_id (null means Inbox), title, body, dump_id
  (nullable, points to `brain_dumps`), created_at
- `brain_dumps`: id, user_id, transcript, created_at. The user can read their
  own rows, and only the function inserts them.

**Don't lose a dump.**
- If sorting fails, keep the transcript on screen with "Try again".
- Sorting is never retried silently.

**Privacy (App Review 5.1.2(i)).** The transcript goes to Anthropic, so:
- the first time a user opens the brain dump, they see a one-time sheet that
  says so, and they agree before anything is sent
- the App Store privacy labels and the privacy policy get a line about it

## What Anthony does (Claude never touches keys)

1. **Anthropic Console:** create an API key for Tsumiki and set a monthly spend
   limit.
2. **RevenueCat:** create a secret API key for the project, for the
   server-side Pro check.
3. Set both as Edge Function secrets, pasting each from the clipboard so it is
   never typed into a chat:

   ```
   npx supabase secrets set ANTHROPIC_API_KEY=… REVENUECAT_SECRET_KEY=…
   ```

4. OK the migration push, the function deploy, the build and TestFlight. Each
   step needs his yes.

## Shipping

- It goes out in **one build together with the new app layout above**, after
  the Free/Pro work in the main app session lands. Anthony asked for this.
- First stop is TestFlight. Anthony does a full test there, and we tweak before
  anything is submitted.
- Once it ships, add "AI Brain Dump" to `copy.paywall.includes` in
  `src/copy.ts`. Until then the paywall leaves it out.

## Cost

Each dump is one short call, roughly $0.02–0.04 on `claude-opus-5-5`, so the
daily cap of 30 means at most about $1 per user per day. Haiku 5.5 would cost
about 1/40 of that. Choosing the model is Anthony's call, and Opus is the
default until he says otherwise.

## Dropped from the old Part 7 for v1 (my call)

- The 🎙️ button in the note editor. The keyboard's own mic already works
  there, and hold-to-talk stays a brain-dump (Pro) thing.
- One-tap "note → to-do / habit". Add it once someone asks for it.

## Left to the builder

- The exact prompt, within the shapes above.
- The animations: mic pulse, sorting state, "✦ new" marker.
- The emoji and colour of a new AI-made folder (the model suggests an emoji;
  the colour is the next unused one in `habitColors`).
- Whether Notes search is client-side. It can be at this size.
