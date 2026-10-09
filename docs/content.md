# Content

Drafts for posting, one section per change in [changelog.md](changelog.md).
Nothing here is published until you say so.

Every entry carries the same two lines, so an unfinished one is obvious:

- **Assets** — the clip in [demos/](demos/), and anything still to record
- **X / Twitter** — the post, ready to paste

Status is `todo`, `ready`, or `posted`.

---

## 8 October 2026 · Three things the eye caught before the code did

**Status:** ready

**Assets** — `2026-10-08-today-header-compare.mp4` and
`2026-10-08-progress-compare.mp4` (8s each). Post separately; they are two
different points.

**X / Twitter** — the status bar one:

> My app's header scrolled straight over the clock. White on white — each
> perfectly legible on its own, neither readable together.
>
> All five tabs scroll the same way and none of them handled it, so it's one
> fade over the whole tab area rather than five patches. A fade, not a bar:
> every screen has a big coloured wash at the top and a solid band cuts a flat
> edge through it.

**X / Twitter** — the Progress one:

> A habit at 43% looked healthier than one at 45% sitting right under it.
>
> Each card was tinted with its own habit's colour. So the two things on the
> card that read as a verdict — the hue and the number — disagreed with each
> other, and the hue won.
>
> The colour identifies the habit now. The number is the only thing allowed an
> opinion.

---

## 8 October 2026 · The water never actually reached the brim

**Status:** ready

**Assets** — `2026-10-08-check-in-compare.mp4` (7s, updated).

**X / Twitter**

> Shipped a check-in animation yesterday and it was wrong in a way I could only
> see one frame at a time.
>
> The water is sprung so it overshoots and sloshes. But the sheet was exactly
> the height of the card — so overshooting lifted its bottom edge clear and left
> a dark band there. The one moment meant to read as full was the one moment
> with a gap in it.
>
> Fix: spare water underneath, which nobody ever sees. That's the point.

---

## 8 October 2026 · The crew screen said the same thing three ways

**Status:** ready

**Assets** — `2026-10-08-crew-compare.mp4` (5s, both sides in one video).

**X / Twitter**

> Three things on one screen, all the same kind of wrong — it knew what it meant
> and didn't say it.
>
> My tile said "Checked in" in a green pill. Everyone else's said "✓ In" in
> plain text. One state, two drawings, side by side.
>
> The header said "2/5 crew" next to "2 of 2 in". Both read as two-of-something.
> They were counting different things.
>
> And Report sat between a person's time and their status, unlabelled — which
> reads as a layout bug, not a control.

---

## 8 October 2026 · The paywall said "unlimited" above its own exception

**Status:** ready

**Assets** — `2026-10-08-paywall.mp4` (5s). Post the clip; the copy carries the
before/after on its own.

**X / Twitter**

> Found this on my own paywall.
>
> "Unlimited habits and crews" — directly above "with up to four friends on
> each". Nothing in the app is capped at a number anyway; the free days just run
> out. So the word was lifting a limit that doesn't exist, while standing on top
> of one that does.
>
> Now it says what the app does.

---

## 8 October 2026 · Always a way back

**Status:** todo — needs a clip of a deep-linked screen and its back button.

**Assets** — none recorded. The fix is a control that now does something, which
is hard to show; a clip opening the app on a habit from a link and tapping back
would do it.

**X / Twitter**

> Every back button in my app had a dead twin.
>
> A screen opened by a link or a notification is the first thing in the stack,
> so back() had no history to pop and silently did nothing. The control was
> there. It looked pressable. It wasn't.
>
> Nineteen of them now fall through to Today when there's nothing behind them.

---

## 8 October 2026 · The time zone was never being saved

**Status:** ready — no clip; this one is a screenshot of a database column.

**Assets** — none needed. Post as text, or a screenshot of the profiles table
with every row reading UTC.

**X / Twitter**

> Every profile in my database said UTC. Including people who have never been
> near it.
>
> The line that keeps it in step with the device built a request and threw it
> away — a Supabase query builder sends nothing until something awaits it, and
> `void supabase.from(...)` awaits nothing. It had been doing that since the
> schema was written.
>
> Not cosmetic. Quiet hours are read in that zone, so 10pm meant 6pm on New York
> time: bedtime reminder suppressed, 3am treated as fair game. And the nightly
> streak job decides a day has ended in that zone while the app files check-ins
> in the device's — so an evening check-in landed on tomorrow and the day it
> belonged to was judged empty.

---

## 8 October 2026 · Seeing your own code

**Status:** ready — no clip needed.

**Assets** — none. This one is a story, not a picture.

**X / Twitter**

> Spent an afternoon fixing a bug that was already fixed.
>
> The build on my simulator was a release build. It carries its JavaScript
> inside it and never asks the dev server for anything — so every change I made
> was invisible there, and the screen went on showing a bug I'd already killed.
>
> I kept re-explaining the fix. The simulator kept showing the old one. Neither
> of us was wrong.

---

## 8 October 2026 · A done habit gets out of the way

**Status:** ready

**Assets** — `2026-10-08-my-day-before.mp4` (5s) and
`2026-10-08-my-day-check-in.mp4` (6s). Post as a pair, before first.

**X / Twitter**

> Before: twelve habits done, twelve loud cards. You had to read all of them to
> learn there was nothing left to do.
>
> After: a finished habit shrinks to a line and gives its room back.
>
> The fill wasn't wrong. It was wrong as a resting state.


---

## 8 October 2026 · Checking off feels like water

**Status:** ready

**Assets** — `2026-10-08-check-in-compare.mp4` (3s, both sides in one video).
Post that one on its own.

**X / Twitter**

> Before and after of checking a habit off. Same habit, same place, same day.
>
> The old one: tap an outlined card, it is solid in the next frame. Nothing
> moves, nothing lands, and the thing you just did is already over.
>
> The colour floods up, two sheets of it drifting at different speeds so the
> surface reads as liquid. It overshoots the brim, throws a few droplets, and
> the card folds down to a struck-through line.
>
> Two thirds of a second. Undo gets none of it.

Reply, if you want the second beat — this one is the honest post and will
travel further than the first:

> The droplets were invisible in the first three versions.
>
> Painted under the card. Faded out a twelfth of the way into the flight, so
> they were brightest while still inside the card — in exactly the card's
> colour. And they launched from its centre instead of its brim.
>
> Screenshots said it was working. Twice.


---

## Template

Copy this for the next change.

```md
## <date> · <what changed>

**Status:** todo

**Assets** — the clip in demos/, and anything still to record.

**X / Twitter**

> draft

