# Content

Drafts for posting, one section per change in [changelog.md](changelog.md).
Nothing here is published until you say so.

Every entry carries the same two lines, so an unfinished one is obvious:

- **Assets** — the clip in [demos/](demos/), and anything still to record
- **X / Twitter** — the post, ready to paste

Status is `todo`, `ready`, or `posted`.

---

## 11 October 2026 · Two trials were running at once

**Status:** todo

**Assets** — still to record: the end of setting up on a locked account, before
and after, side by side. The before is the old paywall checked out of git and
run again — tap "Not now" and the identical screen comes back. Needs the
simulator signed in as the throwaway test account, which is locked under the new
rule.

**X / Twitter**

> My app was running two free trials at the same time and I didn't notice for
> a week.
>
> One was Apple's: three days free, card on file, renews into a subscription.
> The normal thing.
>
> The other was mine. Open the app with no trial stamp and it wrote one. Three
> days later it locked you out of your own habits — no card, no renewal, no way
> back in. A trial that only knew how to end.
>
> Deleting mine took four lines. Finding everything that quietly depended on it
> took the rest of the morning:
>
> · the nightly streak job had its own copy of the rule, and the two had drifted
> apart on exactly the case I was changing
> · the end of onboarding dismissed one paywall straight into another
> · the wall said "your free days are up" to people who never had any
>
> And then the part I nearly shipped without doing: counting who the new rule
> actually locks. Twelve accounts. People who had set up a routine, five to
> nine moments each, who'd open the next build and find a paywall where three
> free days used to be. Moved the grandfather line to cover them. They turned
> up before there was any reason to.
>
> The streak one was the scary one. A locked member stops counting as due. Get
> that backwards and one person who never subscribed resets a streak four other
> people are keeping alive.

## 10 October 2026 · Eight settings on one screen

**Status:** todo

**Assets** — [demos/2026-10-10-profile-reveal.mp4](demos/2026-10-10-profile-reveal.mp4),
and a before/after still would carry this one even better than the clip.

**X / Twitter**

> My settings screen had eight sections on it, and every one of them was fully
> expanded at all times.
>
> Theme chips. Four lines of push status. A list of blocked people that is
> empty for virtually everyone. A delete-account confirmation that unfolded in
> the middle of it.
>
> Nothing was findable because everything was visible.
>
> It is a profile now. A row says what the setting is and what it is set to —
> "Notifications · Off" — and the detail lives on its own screen where there is
> room to explain itself.
>
> The fix was mostly deletion. Three new screens, and the one I was proudest of
> writing is the one nobody will ever notice: the divider between rows is drawn
> by the group, not by each row, so the last one does not carry a line to
> nothing.

Reply, if you want it:

> Related: I had built the account and feedback screens the week before as
> plain forms, and they looked nothing like the rest of the app. My own
> working rules say to reuse the components when something is not on the
> canvas. I wrote that rule. I did not follow it.

---

## 10 October 2026 · The free trial that was not a trial

**Status:** todo

**Assets** — a screenshot of the paywall is enough. The button is the story and
it is right there in the middle of it.

**X / Twitter**

> My paywall had a button that said "Start my free 3 days".
>
> It did nothing.
>
> No payment, no Apple, no trial. It closed the sheet and started a timer of
> my own, and three days later the app locked with no card on file and no way
> back in except paying.
>
> The Subscribe button next to it was worse. It charged full price with zero
> free days — because I had never actually created the introductory offer in
> App Store Connect. The offer the paywall was advertising did not exist
> anywhere except in my own copy.
>
> I checked the database this afternoon. Sixteen accounts. Twelve of them lock
> within 48 hours.
>
> Fixed in 1.2: the offer is real now, and what the button says comes from
> StoreKit instead of a constant. If you have already used your one trial —
> Apple allows one per Apple ID per subscription group, for ever — it says
> "Subscribe", because that is what is about to happen to your card.

The number is the post. "Twelve of them lock within 48 hours" is the line
people will quote, so do not bury it.

Reply, if you want the second beat:

> The part that gets me is that every piece of it was separately reasonable.
>
> A free trial, a paywall, a button to dismiss it. I wrote the copy for the
> dismiss button and the copy for the trial on the same afternoon and never
> noticed they were the same promise made twice, once by something that could
> keep it and once by something that could not.

---

## 10 October 2026 · Tsumiki 1.2

**Status:** todo

**Assets** — [demos/2026-10-09-setting-up.mp4](demos/2026-10-09-setting-up.mp4)
for the onboarding fix, and the 1080x1920 slides in
[slides/](slides/) for anywhere that wants a still.

**X / Twitter**

> Tsumiki 1.2 is going to Apple. It is almost entirely things people told me
> were broken.
>
> Setting up had five steps. Most people saw two — step 2 writes your routine,
> and step 2 also checks on mount whether you already have one and throws you
> out if you do. It never unmounted. So the moment it saved, its own guard
> turned true and ejected you from the flow you were halfway through.
>
> You can now tell me what is wrong from inside the app. Change your email.
> Set a password. Reset one you forgot — none of which were possible before,
> which I did not fully register until somebody asked.
>
> Light mode was washing everything out. Turned out the colour glow behind
> every screen was using the same opacity on both themes. On near-black it
> reads as depth. On near-white it is a coloured panel sitting on top of your
> content.

Shorter than the trial post on purpose. A release note is not a story; the
trial one is. If only one goes out this week, send that one.

---

## 9 October 2026 · Setting up runs all five steps

**Status:** todo

**Assets** — [demos/2026-10-09-setting-up.mp4](demos/2026-10-09-setting-up.mp4),
20s, the whole flow start to finish.

**X / Twitter**

> My onboarding is five steps. Most people were seeing two of them.
>
> Step 2 writes your routine. Step 2 also checks, on mount, whether you already
> have a routine — and if you do, it sends you out of setup, because you are
> not supposed to be there.
>
> It never unmounted. So the moment it saved, its own guard turned true and
> threw you out of the flow you were halfway through. Steps 3 and 4 never
> happened. You landed on the paywall having never been asked what your day
> looks like.
>
> The guard was right about the rule and wrong about the tense. It now reads
> what was true when the screen opened, not what is true by the time it
> finishes.

Attach the clip. The first second is step 1, which is the point — it is the
screen most people never saw.

Reply, if you want the second beat:

> Third time this week I have written a guard that cannot tell "this was
> already true" from "I just made it true."
>
> Same bug in the first check-in screen and in the account-deletion flush.
> It is not a typo, it is a habit.

---

## 9 October 2026 · I broke setting up, for an hour

**Status:** ready — no clip. The evidence is a screenshot of the error on a real phone.

**Assets** — none.

**X / Twitter**

> Added a unique constraint this morning to stop a bug that had given six
> users a doubled schedule. Correct fix. Took an hour to find out what else it
> did.
>
> The setup screen inserts your whole routine on save. Go forward a step, come
> back, tap save again — the screen never unmounted, so its guard never re-ran.
> Before the constraint that silently duplicated everything. That's how all six
> got their doubled day. A back button.
>
> After the constraint, it errors. Forever. You can't finish setting up.
>
> The app fix was one line. It's in a build nobody has — we shipped before
> over-the-air updates existed. So the fix had to go in the database: a trigger
> that drops a duplicate insert instead of raising.
>
> Tightening a rule in the database changes what every client already in the
> wild does when it breaks that rule. And those clients can't be changed.

---

## 9 October 2026 · Six people were seeing their day twice

**Status:** ready — no clip; this one lives in the database.

**Assets** — none. A screenshot of the before is in Caedon's bug report.

**X / Twitter**

> A tester sent me a screenshot: every moment in his day showing twice.
>
> I told him it was a bug I'd fixed on 1 October and he just needed the
> update. Then I actually looked at his rows. They were real duplicates on his
> own account — no release was ever going to touch them. And it wasn't one
> person, it was six, including the account Apple reviews with.
>
> All of them signed up on 1.0, which shipped two days before the screen
> learned to refuse a second save. The fix protected everyone except the people
> it had already happened to.
>
> Reasoning about the bug got me the wrong answer. Querying it took a minute.

---

## 9 October 2026 · Deleting your account left the phone remembering everything

**Status:** todo — no clip. Filming it means deleting a real account; worth
capturing next time one is genuinely being thrown away.

**Assets** — none yet.

**X / Twitter**

> My app shipped yesterday. Today someone deleted their account, signed up
> again, and got no welcome screen, no paywall, and a half-finished setup.
>
> Deleting wiped the server and nothing else. The phone still held every flag
> it had ever set — seen the welcome, been offered the plans, read the hints —
> so a brand new account was handed a returning user's app.
>
> The part I'd have got wrong by guessing: the session isn't stored under my
> app's prefix. It's under the auth library's. A tidy one-line sweep would
> have cleared the flags and left the session sitting there.
>
> Listing what's actually on the device took a minute and changed the fix.

---

## 9 October 2026 · The last page of setting up is gone

**Status:** ready

**Assets** — `2026-10-09-end-of-setup-compare.mp4` (9s).

**X / Twitter**

> Deleted the last page of my onboarding today.
>
> Its only job was hosting one check-in. Two people told me it felt
> unnecessary and one of them couldn't tell the button was working — which is
> a fair verdict on a page that exists for a single tap.
>
> But the tap wasn't the problem. Someone told me months ago the app only
> clicked once they'd actually used it, and that's still true. So the check-in
> stays and the page goes: you land on the real screen with one line pointing
> at the button.
>
> The value was in doing it, not in the page around it.

---

## 9 October 2026 · The screen that stopped reporting

**Status:** ready

**Assets** — `2026-10-09-first-check-in-compare.mp4` (12s).

**X / Twitter**

> "It won't let me tap the check mark."
>
> It let him tap it every time. The screen just stopped reporting it.
>
> "That was it" was its own piece of state, set on the first tap and never set
> back. So the headline froze — undo the check-in and the words still
> congratulated you. And the circle draws a tick in both states, changing only
> its colour. Frozen headline, near-identical circle. Of course it looked dead.
>
> Right about the symptom, wrong about the cause. Worth remembering when
> someone tells you a button is broken.

---

## 8 October 2026 · A button that did not look like one

**Status:** ready

**Assets** — `2026-10-08-routine-remove-compare.mp4` (9s).

**X / Twitter**

> A reader told me he couldn't delete a moment while setting up my app, so he
> was keeping Lunch in his day to fit the schedule it gave him.
>
> He could. The × was there the whole time — 16px, the faintest grey in the
> palette, floating outside the row next to a filled, obviously tappable time
> chip. It read as a divider.
>
> He changed his actual daily routine to fit a screen he had misread. That is
> the most expensive kind of interface bug there is.
>
> It's a button. It looks like one now.

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

