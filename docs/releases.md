# Releases

One entry per version. This is the contract between the two sides of the work:
the code side writes it, the brand side reads it and turns it into posts.

**Status is not remembered, it is read.** App Store Connect knows whether a
version is in review or live, and that can be checked rather than typed:

- App Store Connect → the app → Distribution, the version list in the sidebar
- or `npx eas build:list --platform ios --limit 5` for what has been built

Last read from App Store Connect: **8 October 2026**.

---

## 1.1.0 — build 10 — **Waiting for Review**

Submitted 7 October. Rejected 8 October under guideline 3.1.2. Resubmitted the
same day with a metadata-only fix; the binary never changed.

**The headline:** Tsumiki becomes a subscription, and the whole database of
your own progress gets easier to read.

**What a person gets**

| | |
|---|---|
| Subscription | $29.99/year or $3.99/month, 175 countries, three free days first |
| Grandfathering | anyone who had the app before this version keeps it free, permanently |
| Today | says the whole date — weekday in full, date underneath |
| Progress | opens on Overall: one rate, which habits need work, what to do about each |
| Colours | twenty-four to choose from, up from six |
| Plans | reachable any time from You → Subscription |

**What was broken and is not any more**

- The crew streak counted days **nobody** turned up. Grace absorbed the miss
  and the number still climbed. A forgiven day now holds it steady.
- **Neither scheduled job had ever run.** Reminders and the nightly streak
  evaluation had failed silently since 22 September — a malformed key returning
  401 behind a cron job that recorded every run as a success.
- A crewmate's moment appeared in your own day.
- The page jumped on every check-in.
- The paywall could not scroll, so its Terms and Privacy links were off-screen
  on shorter phones.

**Screens this touched:** Today, Progress, You, Plans (new), New habit.

**Posts this needs:** not yet drafted. The subscription, the Progress rework
and the full date are the three a person would notice.

**Known and shipped anyway**

- Invite links do not open the app from a browser; universal links need the
  Tsumiki domain, which is not registered. The invite screen says so.

**Resolved since submission:** the notification quick actions — "Check in" and
"Heading out now" — are now verified rendering. They were named in the App
Store description and had never been seen working.

---

## 1.0 — **Ready for Distribution**

Approved 28 September 2026, released October. The free version: moments,
habits stacked onto them, crews of two to five sharing one streak, nudges, and
never-miss-twice.

Rejected once on 27 September as a beta build under 2.1(a) — App Review could
not get past the sign-in. Tsumiki has no passwords; the fix was to tell them to
use Sign in with Apple with any Apple ID. Approved the next day.

**Posts:** none. The app launched without a social presence, which is what the
brand side is now starting.

---

## Next — not yet a version

Candidates, roughly in the order I would argue for them:

1. **Universal links**, so an invite opens the app. The crew is the
   differentiator and the invite is how a crew grows; it is the one gap that
   costs new users.
2. **Verify a quick action writes a check-in** end to end. The buttons render;
   that the tap reaches the database without opening the app is still untested.
3. **Automated screenshots** (Maestro), so the design board regenerates against
   every build instead of being captured by hand.
4. **Change a crew's habit**, or decide it can only be replaced — an open
   question from the original brief, never resolved.
5. **What happens to a crew when someone leaves mid-streak** — same.
