# Screen catalogue

Every screen in the app: what it is for, where it lives, and what has to be
true for someone to see it.

This is the document the design board and the social posts both point at. It
is written by hand on purpose — a screenshot is a fact and can be regenerated,
but *what a screen is for* is intent, and intent cannot be derived from the
code. When a screen's purpose changes, this file changes with it.

**Shot** is where the current screenshot of that screen lives, once the capture
run exists. **Needs** is what has to be true to reach it, which is also what a
capture script has to set up.

---

## Before an account

### Welcome · `(auth)/welcome.tsx` · artboard `OnbWelcome`
The first run and only the first run. A carousel explaining what the app is —
moments, crews, the streak — then sign in. "I have an invite link" goes to the
join flow. Somebody who has already been told what this is does not get told
again.
**Needs:** signed out, first launch.

### Sign in · `(auth)/sign-in.tsx`
Email six-digit code, or Sign in with Apple. There are no passwords anywhere in
Tsumiki, which is what the App Review notes explain.
**Needs:** signed out.

---

## Onboarding — in order, each one gates the next

### Routine · `(onboarding)/routine.tsx` · artboard `OnbRoutine`
The moments of your day: wake up, coffee, lunch, home, bed. Defaults are
offered and every one can be renamed, retimed or removed. Sorted earliest
first, because the list is meant to read as a picture of the day — a moment
moved to nine o'clock has to move with it or breakfast sits below bedtime.
**Needs:** signed in, no anchors yet.

### First habit · `(onboarding)/habit.tsx` · artboard `OnbHabit`
Six suggestions, matched back to whichever moments the person actually kept
rather than the defaults they were written against.
**Needs:** anchors exist, no habits yet.

### Profile · `(onboarding)/profile.tsx`
Display name, an emoji and a colour. What a crew sees of you.

### Crew prompt · `(onboarding)/crew.tsx` · artboard `OnbCrew`
Shows where the new habit sits, then: invite friends, or start solo.

### First check-in · `(onboarding)/first-check-in.tsx`
The walkthrough's last step, and the whole app in one move: tap the circle.
Shown once, and only once a habit exists to check in.
**Needs:** at least one habit, walkthrough not yet seen.

---

## The four tabs

### Today · `(tabs)/index.tsx` · artboard `TodayDark`
The home screen. The day as a hand of cards you swipe through, the front one
being whatever is next. Big weekday and full date, a done count, and one
button that checks the focused habit in or undoes it. Done habits deal to the
back. Colour bleed behind everything takes the focused habit's colour.
**Needs:** habits scheduled today. Best shot at a mixed state — some done, some
not — or fully done for the green orb.

### My Day · `(tabs)/my-day.tsx` · artboard `MyDay`
The same habits on an hour grid against your routine, with a NOW line. Hold a
habit to move it to another moment. This is where the day is *arranged*, where
Today is where it is *done*.
**Needs:** habits across several moments. Looks best mid-afternoon.

### Crews · `(tabs)/crews.tsx` · artboards `GroupDark`, `CrewWalk`
Every crew you are in, with its shared streak. Empty state offers "Start a
crew".
**Needs:** at least one crew to be worth shooting.

### Progress · `(tabs)/progress.tsx`
Opens on **Overall**, which is not a period — that is why it comes first. One
rate for the last thirty days, then which habits need work and which are going
well, each with the single thing to do about it. Day, Week and Month answer
"how did this stretch go" and make you pick a stretch first.
**Needs:** several weeks of check-ins or it reads empty.

### You · `(tabs)/you.tsx`
Profile, appearance, **Subscription → See plans**, notification state, quiet
hours, blocked people, sign out, delete account.

---

## Reached from somewhere

### Crew · `crew/[id].tsx`
One crew: the shared streak, the last seven days, and a tile per member showing
whether they are in today. Nudge, Heading out now, Invite, Leave.
**Needs:** a crew with two or more members. Reads best with everyone checked in.

### Habit · `habit/[id].tsx`
One habit's history, with a weekday breakdown that says which day keeps
breaking it.

### New habit · `new-habit.tsx` · artboard `NewHabitDark`
Name, when (after a moment / at a time / anytime), which days, colour from
twenty-four, solo or crew. A live sentence preview reads back what you have
built. Doubles as Edit Habit when opened with `?id=`.

### Schedule · `schedule.tsx`
The shape of your day — the moments habits stack onto. Reached from My Day.

### Plans · `plans.tsx`
The paywall, opened on purpose. Annual and monthly, the feature list, Restore
purchases, Terms and Privacy. Shown once automatically after onboarding with a
way straight past it, and any time from You.
**Needs:** nothing. Reachable in any state, which is the point — it is what
makes the subscription reviewable.

### Paywall as a wall · `components/PaywallGate.tsx`
The same screen with no way past, in front of the tabs once the free days are
up. Different headline, no dismiss.
**Needs:** an account past its trial, created after the grandfather cutoff.

### Nudge · `nudge/[id].tsx` · artboards `NudgeOpen`, `NudgeDone`
A nudge, opened from the push.

### Invite · `invite/[id].tsx` · artboard `InviteSend`
The message and link to send someone.

### Join · `j/[code].tsx` · artboards `InviteJoin`, `InviteJoined`
An invite opened by the person receiving it: pick your own moment, join.
**Known gap:** universal links are not configured, so this does not open from a
browser yet. The screen says so plainly.

### Delete account · `delete-account.tsx`
Lives outside the tabs on purpose, so the paywall cannot trap anyone behind it.

---

## Not screens, but they define how everything looks

- **Dock** `components/Dock.tsx` — two panes of clear glass: the up-next habit
  with its check-in orb, and the five tabs, each lit with a halo in that
  habit's colour. On every tab screen.
- **Bleed** `components/Bleed.tsx` — the blurred colour circles behind every
  screen, tinted by whichever habit the screen is about, cross-fading when it
  changes.
- **HabitFan** `components/HabitFan.tsx` — the hand of cards on Today, and the
  water-fill check-in.
