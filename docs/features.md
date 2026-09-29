# Tsumiki — what the app does

Written from the code, not from memory. Current as of build 5 (1.0.0) plus the
unreleased work on `main`.

---

## 1. Getting in

**Welcome carousel.** Four screens on first launch, each showing a real screen
of the app: a day with habits stacked onto it, a crew sharing one streak, a
nudge arriving, a month of progress. Shown once, then never again.

**Sign in with Apple.** One tap, no inbox. The primary route.

**Email code.** A six-digit code, valid an hour. No magic link on a phone,
because the redirect address is not stable in a development build. Refuses to
ask for a second code until the first has had a chance, and says so with a
countdown rather than failing silently.

**Password.** Present but unadvertised, under "Use a password instead". It
exists so an account can be signed into without an inbox — App Review needs
that. Nobody is offered a password and nobody can create one in the app.

**Onboarding.** Set the moments of your day, pick a first habit, then choose a
crew or start solo.

## 2. The day

**Moments (anchors).** The fixed points of your day — wake up, coffee, work,
lunch, bed. Each has a time, an optional end time (which makes it a block, so
the gaps around it are real), and a colour. Add, rename, retime, recolour,
delete. Deleting one does not delete the habits stacked on it: they become
"anytime" habits instead.

**Habits.** A name, a colour, and a moment. Three ways to place one:
- **After** a moment — the stacking idea, and the point of the app
- **At** a set time
- **Anytime** today

Each habit also carries which days of the week it runs on, and whether it is
solo or shared with a crew.

**Today.** What is left of the day, held as a fan of cards you swipe through.
One fractional position drives every card's slide, lean, scale and shading, so
dragging shuffles them under your finger. Tap a card to check in, tap again to
undo. Finished habits fold away behind a count, where undo still lives.

**My Day.** The same habits on a vertical timeline against your routine, with
a NOW line, free-time gaps, and habits hanging under the moment they are
stacked on. Hold a habit to move it to a different moment.

**The dock.** A floating glass bar: the up-next habit, its moment, a status
line, and a check-in orb with a progress ring for today.

## 3. Crews

**A crew is a habit plus two to five people.** Everyone does the same habit,
but each person picks their own moment and their own days — your walk after
lunch, theirs after work.

**One shared streak**, governed by *never miss twice*:
- Missing a scheduled day is forgiven once; the streak survives
- Missing again before you check in resets it to zero
- Checking in clears the forgiveness for next time

Judged nightly per crew, after the day has ended for the member in the latest
time zone. Idempotent: a missed run catches up, a repeat run does nothing.

**The crew screen** shows the shared streak, the best it has ever been, the
last seven days, and every member with whether they are in today.

**Management** (creator only): rename the crew, remove a member, and rename
the crew's habit — the last only until the first check-in, after which the
streak counts days of a specific thing and renaming it would make the number
a lie.

**Leaving** is anyone's to do, and the streak carries on for the rest.

## 4. Invites

A crew invite makes a short code, good for seven days, and a link. The link
opens a page that hands off to the app. Codes are checked server side, and a
crew is capped at five people there rather than only in the UI.

## 5. Nudges

**One nudge per person per day**, and only if they still owe the day.

Preset messages, or up to sixty characters of your own. Delivery is held until
the recipient's own moment has arrived, and never lands inside their quiet
hours — it waits.

The push carries **quick actions**: check in without opening the app, or say
you are **heading out now**, which tells the crew and quiets reminders and
nudges to you for half an hour.

Being nudged and then checking in shows the streak saved, and two ways to
answer: say thanks, or same time tomorrow.

## 6. Reminders

One push at each habit's expected moment — its anchor's time, or the time you
set. Anytime habits get one at 8pm if still open. Nothing arrives once you
have checked in. Quiet hours are yours to set.

Sent from a job that runs every ten minutes; every send is recorded, so a
repeat run is silent and a missed run catches up.

## 7. Progress

Three shapes for three questions:
- **Day** — a ring per habit, with the run you are keeping
- **Week** — a heat wall, seven marks a row, weakest habit first
- **Month** — a trend, because the shape says more than a number

Step back through history as far as your data goes.

**Advice.** Two tabs, "Needs work" and "Going well", opening on the former.
Each habit gets at most one suggestion, read over a trailing thirty days:
- **Stack it** — floating with no cue
- **Drop that day** — one weekday is dragging it down
- **Lighten that moment** — its anchor has become a queue
- **Ease off** — asked for more days than you keep; here is the number you
  actually keep
- **Let it go** — everything smaller has been tried and it still is not
  happening
- **A run** — nothing to fix, so say what is working

And one suggestion about the week itself, above the rest:
- **A crowded day** — one weekday carries far more than the others and comes
  off worst
- **A day off** — something is due all seven days and it has begun to show

## 8. You

Display name and colour, time zone, quiet hours, blocked people, appearance,
and **delete my account** — which removes your profile, habits, check-ins and
crew memberships immediately, and is reachable from outside the tabs so
nothing can block it.

**Safety.** Report and block on any crew member. Blocking is enforced in the
database, not only the UI.

## 9. Subscription (built, not yet released)

Seven days free from the day you sign up, then a paywall: $3.99 a month or
$29.99 a year, prices read from the App Store rather than hardcoded.

Anyone whose account predates the paywall keeps the app free permanently.

A member whose trial lapses stops counting as due rather than missing, so one
person lapsing cannot reset a streak four other people are keeping alive.

---

## Under it

- **Expo / React Native**, TypeScript strict, `expo-router`
- **Supabase** — Postgres with row-level security on every table, Edge
  Functions, and two scheduled jobs (streaks hourly, notifications every ten
  minutes)
- **Expo Push** for notifications, **RevenueCat** for subscriptions
- **155 tests** over the rules most likely to break quietly: streaks, nudge
  delivery, statistics, advice, entitlement, ordering, sign-in codes
- Everything happens on the member's **local date**, in their own time zone
