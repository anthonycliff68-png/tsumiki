# Changelog

What changed, what it looked like before, and what it looks like now.

Kept for two reasons. The practical one: a screenshot taken a second too late
cannot tell you whether an animation works, and three rounds of a splash got
built here without anyone noticing it was invisible. The other one: this is the
record of how the thing got made, and the good bits of it are worth posting.

Clips live in [demos/](demos/). The whole-app board, regenerated in
one command, is [screenshots/](screenshots/). Posts are drafted in
[content.md](content.md) — every change gets a **Content** line here pointing at
its draft, so one that was never written is easy to spot.

**Capture the before first.** Once a change is in, the old screen is gone and no
amount of care gets it back. The record starts 8 October 2026; nothing earlier
is being backfilled.

To capture more:

```sh
scripts/record.sh check-in /my-day                      # record, Enter to stop
swift scripts/clip.swift raw.mov out.mp4 3 9            # trim to what matters
swift scripts/sidebyside.swift b.mp4 a.mp4 c.mp4 "Title"  # both in one video
scripts/stage.sh                                        # lay it out in Downloads
```

A before and an after posted as two clips arrive as two thumbnails, play
separately, and leave the reader holding the first one in their head while they
watch the second. Side by side they are one thing.

They do not play at once. The whole difference is a few tenths of a second long,
and playing both together makes the viewer pick a side and miss the other. The
before runs, it holds on its last frame, and then the after runs — both phones
on screen throughout, with only one of them moving at any moment. Record both
takes on the **same habit, in the same place**, or the comparison is of two
different screens and proves nothing.

Recordings, not stills. A screenshot cannot show an animation, and a pair of
them arrives on X as two thumbnails the reader has to work out the order of. One
clip says it in the first second, which is the only one you are reliably given.

`scripts/record.sh` captures, `scripts/clip.swift` trims off the dead air at
each end and writes an mp4, and `scripts/stage.sh` lays it all out in
`~/Downloads/Tsumiki Posts/<date>/`.

---

## 8 October 2026

### The crew screen said the same thing three ways — `9647d74`

Three small things, all on one screen, all the same kind of wrong: the screen
knew what it meant and didn't say it.

**One state, two drawings.** Your own tile said "Checked in" in a green pill.
Everyone else's said "✓ In" in plain text on no background. Side by side on the
same row, a crew in one condition looked like a crew in two. Both tiles now
carry the same chip, with the same tick and the same words; yours is still the
only one you can press, because undoing is only ever your own to do.

**Two counts, both reading "2 of something".** The header pill said "2/5 crew"
a thumb's width from "Crew · 2 of 2 in". One counted the people in the crew, the
other the people who had turned up today. They now say which they mean: **2 of 5
members**, and **2 of 2 checked in today**.

**Report, wedged in the middle.** It sat between a person's moment and their
status — an unlabelled word with no icon and no box, which reads as something
gone wrong in the layout rather than as a control. It moves to the end of the
tile and stays quiet. Nobody reaches for it in the normal course of a day; it
only has to be findable when they do.

**[Side by side](demos/2026-10-08-crew-compare.mp4)** — 5s. Also on their own:
[before](demos/2026-10-08-crew-before.mp4) · [after](demos/2026-10-08-crew-after.mp4).

**Content:** drafted — [content.md](content.md#8-october-2026--the-crew-screen-said-the-same-thing-three-ways).

### The paywall said "unlimited" above its own exception — `2d2dac1`

The first feature line read *"Unlimited habits and crews — stack as many as your
day can hold, with up to four friends on each"*. Wrong twice.

Nothing in Tsumiki is capped at a number, so there was no limit for "unlimited"
to lift. The free days run out and the app locks: a different promise, and the
only one the build can actually be checked against — which matters on the screen
that already drew a 3.1.2 rejection. And a crew really does stop at five,
enforced by a trigger on `crew_members` rather than only by the UI, so the word
sat directly above its own exception.

**[The paywall, as it reads now](demos/2026-10-08-paywall.mp4)** — 5s.

Copy only. No behaviour, no pricing, no entitlement logic changed.

**Content:** drafted — [content.md](content.md#8-october-2026--the-paywall-said-unlimited-above-its-own-exception).

### A done habit gets out of the way — `9f2e38e`

My Day used to fill a habit's card with its colour when you checked it off. The
encoding was backwards: a finished day became the loudest thing on the screen,
twelve solid cards with nothing left to do, and no way to see that without
reading all twelve. This timeline is for what is still coming.

A done habit now shrinks to a struck-through line with a stub of its colour and
gives its room back.

**[Before](demos/2026-10-08-my-day-before.mp4)** · **[After](demos/2026-10-08-my-day-check-in.mp4)**
— 5s and 6s. The before was recorded afterwards, by checking the old component
out of git and running it; the screen itself was gone by then.

Costs the edit handle on a done habit. Editing is still a tap away on Today and
on Progress, and comes back if you undo.

**Content:** drafted — [content.md](content.md#8-october-2026--a-done-habit-gets-out-of-the-way).

### Checking off feels like water — `4435cc7`, `54f47e1`

The fold alone was efficient and felt like nothing — card to line in one frame,
so the thing you just did vanished rather than registering. The fill was never
wrong; it was wrong as a *resting* state. As a moment it is exactly right.

The habit's colour now floods up from the bottom of the card, two sheets
drifting sideways at different speeds so the surface reads as liquid rather than
as a rectangle with a decorated edge. It overshoots the brim, sloshes, throws
nine droplets off the top, and folds to its line with the strike drawing across.
About two thirds of a second. Undo gets none of it — taking something back is a
correction, not an achievement.

**[Side by side](demos/2026-10-08-check-in-compare.mp4)** — 3s. The same habit,
in the same place on the same day, tapped on both builds. The before is the old
component checked out of git and run again: tap an outlined card and it is solid
in the next frame, nothing moves, nothing lands, and the thing you just did is
already over.

Also on their own: [before](demos/2026-10-08-check-in-before.mp4) ·
[after](demos/2026-10-08-check-in-after.mp4).

The droplets took three attempts and were invisible in all of them. They were
painted under the card, they faded out a twelfth of the way into the flight
— brightest while still inside the card, in exactly the card's colour — and they
launched from its centre rather than its brim. Found by stepping through a
screen recording frame by frame. A still screenshot had said "working" twice.

**Content:** drafted — [content.md](content.md#8-october-2026--checking-off-feels-like-water).

### Always a way back — `73cc26c`

A screen opened by a deep link or a notification is the first thing in the
stack, so its back control called `router.back()` with nothing to go back to and
silently did nothing. It looked pressable. It was not. Nineteen back buttons now
go through one helper that falls through to Today when there is no history.

Same commit: the habit screen accepts the front of an id, because ids reach it
through a human and a human copying a uuid copies the first eight characters.

### The time zone was never being saved — `d4a89be`

Every profile in the database said `UTC`, including people who have never been
near it. The line meant to keep it in step with the device built a request and
threw it away — a Supabase query builder sends nothing until something awaits
it, and `void supabase.from(...)` awaits nothing. It had been doing that since
the schema was written.

Not cosmetic. Quiet hours are read in that zone, so ten at night meant six in
the evening on New York time: the bedtime reminder suppressed, three in the
morning allowed. And the nightly streak job decides a day has ended in that zone
while the app files check-ins in the device's, so an evening check-in landed on
tomorrow and the day it belonged to was judged empty.

### Seeing your own code — `73cc26c`

The build installed on the simulator is a release build. It carries its
JavaScript inside it and never asks the dev server for anything, so every change
made that afternoon was invisible there and a bug that had already been fixed
went on being reported. `scripts/reload.sh` builds the JavaScript and drops it
into the installed app in about a minute, until a development build is set up.
