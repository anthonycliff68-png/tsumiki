# Reply to App Review — Guideline 2.1, Information Needed

> **Apple's reply box has a 4,000 character limit.** The shortened version
> that fits is in `app-review-reply-short.txt` beside this file; the long
> version below is for the App Review Information → Notes field, which has
> more room.

Paste everything below into the **Resolution Center** reply, and also into
**App Review Information → Notes** so future submissions have it.

Nothing here needs a new build. This is an information request, not a defect.

---

## 2. What the app is for, and who it is for

Tsumiki helps people build habits by attaching them to routines they already
have, and by doing them alongside a small group of friends.

**The problem.** Most habit apps are a checklist and a reminder. People know
what they want to do; what fails is remembering to do it and caring whether
they did. Tsumiki addresses both: a habit is anchored to an existing moment
in the day ("after lunch"), so there is a natural cue, and it is shared with
two to five friends who can see whether you turned up.

**The audience.** Adults who have tried and abandoned a habit tracker, and
who have at least one friend willing to do the same thing at the same time.
It is not aimed at children. It is rated 9+ because crew members can send
each other short messages.

**The value.** A shared streak that survives one missed day but not two, so a
bad week does not undo a good month, and a nudge from a friend rather than a
notification from an app.

## 3. Setting up and reaching the main features

**Signing in.** Tsumiki has no passwords, so there is no demo username or
password to supply. On the first screen, tap **Sign in with Apple** and use
any Apple ID, including a test account. That creates a fresh account and goes
straight into onboarding.

The other option emails a six-digit code to an address you enter, which needs
an inbox you control. Sign in with Apple avoids that and is the quickest way
in.

**Then, in order:**

1. Onboarding asks for the moments of your day (wake up, lunch, and so on).
   The defaults can be accepted as they are.
2. Pick a first habit from the suggestions.
3. At the crew step, choose **Start solo**. A crew needs a second real
   person, so it cannot be fully exercised from one device.
4. **Today** holds the habits left today as a fan of cards. Swipe sideways
   through them; tap a card to check it in, tap again to undo.
5. **My Day** shows the same habits on a timeline against your routine.
6. **Progress** shows rings for a day, a heat wall for a week and a trend for
   a month. A new account has no history, so these fill in as you check in.
7. **You** holds quiet hours, blocked people, and **Delete my account**.

**User-generated content, reporting and blocking.** The content users create
is habit names, routine labels, and the text of a nudge (60 characters, sent
between members of the same crew). There is no feed, no public profile, and
no way for a stranger to reach anyone. Reporting and blocking are on the crew
member's row and in **You → Blocked people**.

**Deleting an account.** **You → Delete my account** removes the profile,
habits, check-ins and crew memberships immediately. It is also reachable from
outside the main tabs so it cannot be blocked by anything.

## 4. External services used

| Service | What it does |
|---|---|
| **Supabase** (supabase.com) | Authentication, Postgres database, server-side functions and scheduled jobs. Hosts all user data. |
| **Apple — Sign in with Apple** | Primary authentication. |
| **Expo Push Notification Service** (expo.dev) | Delivers habit reminders and nudges. |

No AI services. No payment processors — the app is free and has no in-app
purchases in this version. No third-party data providers. No advertising
network and no analytics SDK.

## 5. Regional differences

There are none. Every feature behaves identically in every region and the app
is offered in English only.

Dates and times are interpreted in the device's own time zone rather than the
server's, so a habit is due on the user's local date wherever they are. That
is the only location-dependent behaviour, and it uses the device setting — no
location permission is requested and no location data is collected.

## 6. Regulated industry or third-party material

Not applicable. Tsumiki is not a medical, health-data, financial or otherwise
regulated product. It records whether a person did something they chose to
write down; it gives no advice, makes no claims, and reads no data from
HealthKit or any other source. All content in the app is either ours or
written by the user.

---

# 1. The screen recording

Record on a **physical iPhone** running the current iOS, from the TestFlight
build. Start with the app not yet launched.

Use a **throwaway Apple ID** if you have one — the recording has to end with
the account being deleted, and that deletion is real.

**Shot list, in order:**

1. Tap the app icon. Show the launch and the welcome carousel, swiping
   through all four screens.
2. **Sign in with Apple.** Show the sheet and the return into onboarding.
3. Onboarding: accept the default moments, pick a first habit, choose
   **Start solo**.
4. **Today**: swipe through the cards. Tap one to check it in. Tap again to
   undo. Show the dock's check-in ring updating.
5. **My Day**: show the timeline with the habit under its moment.
6. Create a habit: **+ New habit**, type a name, pick "After" and a moment,
   pick a colour, save. Show it appear on Today.
7. **Progress**: show Day, Week and Month.
8. **Crews**: tap **Start a crew**, show the invite screen and the link that
   would be sent. Say aloud or caption that a crew needs a second person.
9. **Reporting and blocking**: open a crew member's row and show the report
   and block actions. Then **You → Blocked people**.
10. **You → Delete my account.** Show the confirmation and the deletion
    completing, ending back at the sign-in screen.

Do **not** show any paid feature: this version has none.

Keep it unhurried. A reviewer is checking that the flows exist and work, not
watching for speed.
