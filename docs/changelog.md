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

## 9 October 2026

### I broke setting up, for an hour — `PENDING`

The unique index an hour earlier did what it was for and something it was not.

The setup screen inserts the whole routine on "Looks right". It guards against
a second save when it first appears, but going forward a step and coming back
leaves it mounted, so the guard never re-runs and a second tap fires a second
insert. **That is how all six accounts got their doubled day** — not a
mysterious old build, just a back button.

Before the index that quietly made duplicates. After it, the insert failed, the
screen said *"Could not save your routine. Try again."*, and it would have said
it every time. Somebody could have sat on step 2 of setting up with no way
forward. Paq hit it on his own phone within the hour.

The app now upserts, which is the proper fix and is in a build nobody has: 1.1
shipped before over-the-air updates existed, so the only place a fix reaches
today's users is the database. A trigger drops an insert for a moment that
already exists instead of raising — the row the caller wanted is already there,
which is what they were asking for. The index still guarantees there is only
ever one.

Live users were fixed without a release. Verified: the trigger is on, a repeat
insert raises nothing, and there are still no duplicates anywhere.

The lesson is not about the index, which was right. It is that tightening a
rule in the database changes what every client already in the wild does when it
breaks that rule — and the client in the wild could not be changed.

**Content:** drafted — [content.md](content.md#9-october-2026--i-broke-setting-up-for-an-hour).

### Six people were seeing their day twice — `21f0ace`

Caedon reported "each event pops up twice" with a screenshot of Wake up, Gym,
Coffee, Work starts and Lunch all doubled. I said it was the crewmate-leak bug
fixed on 1 October and that he only needed the release. **That was wrong**, and
checking his rows rather than reasoning about them is what showed it: the
duplicates are genuine rows on his own account, and no release would have
touched them.

It is six accounts, not one, and the App Review login is among them. Every one
signed up on 1.0, which went to the App Store on 28 September — two days before
the setup screen learned to refuse a second save. The guard protects everyone
from this version on and nobody it already happened to.

29 duplicate rows are gone, each an exact copy of one that stays. No habit
moved: nothing was hanging off any of them. A unique index on
`(user_id, label, usual_time)` now refuses the next one, from any client and
any version — a rule the app keeps is only as good as the version running it.

**Label and time, not label alone.** One account has "Brush teeth, bed" at
22:00 *and* 22:30, which is somebody editing a copy rather than the bug. A
constraint on the name by itself would have forced the cleanup to choose which
of their two bedtimes to destroy. Exact copies are the fault; a repeated name
at a different time is a decision, and it is still allowed.

Verified after: no duplicates left, the index present, and an attempted
duplicate insert rejected by name inside a transaction that rolled back.

**Content:** drafted — [content.md](content.md#9-october-2026--six-people-were-seeing-their-day-twice).

### Deleting your account left the phone remembering everything — `eff9edf`

Reported from the live build the day 1.1 was approved: delete your account,
sign up again, and the app skips the welcome carousel, never offers the plans,
and drops you somewhere in the middle of setting up.

`delete_my_account` wiped the server and nothing else. The device kept every
flag it had ever set — `tsumiki.welcome.seen`, `tsumiki.plansOffered`, the
hints — and the stored session with them, so a brand new account was handed a
returning user's app. Nothing was broken; the phone was just answering
questions about somebody who no longer existed.

Deleting now flushes the device: the session first, then every `tsumiki.` key,
then the query cache, then back to the top. The next person to open the app
finds it the way the App Store does.

Two things that only came out of actually listing what is stored. The session
is kept under `sb-…`, not `tsumiki.`, so a prefix sweep would have cleared the
flags and left the session behind — the one key that matters most. And
`signOut` cannot be relied on to remove it, because by then the user it belongs
to has stopped existing, so the key is removed by hand as well.

**Content:** drafted — [content.md](content.md#9-october-2026--deleting-your-account-left-the-phone-remembering-everything).

### The last page of setting up is gone — `46f29a6`

Onboarding ended on a page whose only job was one check-in. Two readers found
it unnecessary and one of them could not tell the button was working, which is
a fair verdict on a page that exists to host a single tap.

The tap was never the problem. A reader told us months ago that the app only
made sense once they had actually used it, and that is still true — so the
check-in stays and the page goes. You land on Today, the real screen, with one
line pointing at the orb: *"One tap on the circle checks a habit off. Try it."*
Same habit, same tap, nothing in between.

The page was also the only place the app explained the rule it runs on. That
moves to Today too, and arrives the first time there is a check-in to explain
it against — which is the first moment it means anything rather than the last
moment before you are let in. Both use the hint component that was already
there for exactly this: one line, once, then never again.

**[Side by side](demos/2026-10-09-end-of-setup-compare.mp4)** — 9s. Same step,
same button, different landing.

**Content:** drafted — [content.md](content.md#9-october-2026--the-last-page-of-setting-up-is-gone).

### The screen that stopped reporting — `05b310c`, `76a8407`

Two reports, one screen, and the first one was right about the symptom and
wrong about the cause: *"when it has the last habit on the 'take me in' — it
won't let me tap the check mark."*

It let you tap it every time. **"That was it" had its own piece of state**, set
the moment the orb was first tapped and never set back, so the headline froze
there for good — undo the check-in and the words still congratulated you. The
orb draws a tick in *both* states and changes only its colour, so somebody
toggling it saw a frozen headline above a circle that looked much the same
either way. Entirely reasonable to call that a dead button. Reading the state
from the habit means the whole screen moves when the orb does: headline,
explanation, and the button between "I will do it later" and "Take me in".

Then the second report: **the check should take you in on its own.** It now
does, after holding the confirmation for nine tenths of a second. Long enough
to see the headline land and catch the first line about what happens tomorrow,
which onboarding explains nowhere else; short enough that it never reads as
waiting. It began at a second and a half and that was too long — a pause at the
end of setting something up is the one pause nobody wants. Going instantly
would have bought a tap and lost the only explanation of the rule the app is
built on.

Two edges that needed saying out loud. Arriving on a habit already checked off
does **not** trigger the exit — you have not just done anything, and being
thrown out would read as a malfunction. And it is the *change* from unchecked to
checked that triggers it, not the state: an earlier version asked only how
things started, so undoing and re-checking sat there doing nothing.

**[Side by side](demos/2026-10-09-first-check-in-compare.mp4)** — 12s.

**Content:** drafted — [content.md](content.md#9-october-2026--the-screen-that-stopped-reporting).

## 8 October 2026

### A button that did not look like one — `19217f2`

Reported by a reader with a screenshot: *"I can't delete habits at the start of
setting up. This makes it rough if for example I don't do lunch but now I'm
accepting that into my new schedule with the app."*

He could. The control was there the whole time — a 16px cross in the faintest
grey in the palette, sitting outside the row with nothing around it, next to a
filled and obviously tappable time chip. It read as a divider. He changed his
actual daily routine to fit a screen he had misread, which is the most
expensive kind of interface bug there is.

It is a button, so it looks like one: the cross sits in a bordered circle, a
shade brighter, inside a 44pt target. And the blurb now says the thing out loud
— *"Rough times are fine, and drop any you do not do."* A control nobody can
find and a permission nobody knows they have are the same bug twice.

**[Side by side](demos/2026-10-08-routine-remove-compare.mp4)** — 9s. The after
drops Lunch, which is the one he was stuck with.

**Content:** drafted — [content.md](content.md#8-october-2026--a-button-that-did-not-look-like-one).

### Three things the eye caught before the code did — `82844d6`

**Today scrolled its header into the status bar.** THURSDAY and the day's count
rode straight over the clock and the battery — white on white, each legible
alone and neither readable together. Every tab scrolls the same way and none of
them handled it, so the fix is one scrim over the whole tab area rather than
five patches. A fade rather than a bar: each screen carries a large coloured
bleed at the top and a solid band would cut a flat edge across it.

**[Side by side](demos/2026-10-08-today-header-compare.mp4)** — 8s.

**Progress tinted each card with its habit's colour.** A teal habit at 43% read
as healthier than an orange one at 45% sitting directly under it: the two things
on the card that look like a verdict were the hue and the number, and they
disagreed. The colour now identifies the habit — in the bar, and nowhere else —
and nothing on the card carries an opinion except the figure.

**Two habits got letter-identical advice.** Both landed on the same rule and the
same prescription, which was correct and read as a copy-paste fault. Each
sentence now carries its own habit's figures: *Kept 13 of 30* against *Kept 5 of
11*. The count that used to sit above the advice went with it, since it was then
being said twice.

**[Side by side](demos/2026-10-08-progress-compare.mp4)** — 8s.

**Content:** drafted — [content.md](content.md#8-october-2026--three-things-the-eye-caught-before-the-code-did).

### The water never actually reached the brim — `9fb0e92`, `6208321`

Two things on the same screen, both of them the gap between what the code
intended and what it drew.

**The level overshot off the bottom of its own card.** The rise is sprung so it
arrives with weight and sloshes, but the sheet of water was exactly the height
of the card — so overshooting lifted its bottom edge clear and left a dark band
there. The single moment that was meant to read as *full* was the one moment
with a gap in it. The sheet now carries spare water underneath, which is never
seen and is the entire point. The droplets were leaving on a fraction of a
nominal rise rather than on arrival, so they fired while the level was still
halfway up; they now go when it lands.

**A moment's colour sat in the middle of its habits.** The tick beside Coffee
and Lunch was centred in its row — and a moment's row is as tall as everything
stacked underneath it, so the colour came out level with the habits rather than
with the word it names. Top-aligned now, beside its label, which is the only
place it has to line up.

**The strike stopped a third of the way along.** It was drawn to the width of
the habit's name, which on a full-width row reads as an animation that gave up
rather than as a line through a finished thing. It now runs the width of the
row, in 130ms rather than 160.

**The sheets ran out of water sideways.** Each one started flush with the card
and drifted right, which walked its own left edge into view about a third of
the way across — a visible step in the middle of what is meant to be one
surface. They now begin a full card to the left and drift by exactly one card,
which is also the period the crest tiles at, so the loop has no seam either.

**[Side by side](demos/2026-10-08-check-in-compare.mp4)** — 7s.

**Content:** drafted — [content.md](content.md#8-october-2026--the-water-never-actually-reached-the-brim).

### The crew screen said the same thing three ways — `8401e1d`

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

### The paywall said "unlimited" above its own exception — `529851a`

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

**Content:** drafted — [content.md](content.md#8-october-2026--always-a-way-back).

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

**Content:** drafted — [content.md](content.md#8-october-2026--the-time-zone-was-never-being-saved).

### Seeing your own code — `73cc26c`

The build installed on the simulator is a release build. It carries its
JavaScript inside it and never asks the dev server for anything, so every change
made that afternoon was invisible there and a bug that had already been fixed
went on being reported. `scripts/reload.sh` builds the JavaScript and drops it
into the installed app in about a minute, until a development build is set up.

**Content:** drafted — [content.md](content.md#8-october-2026--seeing-your-own-code).
