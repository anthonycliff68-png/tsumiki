# Release log

What shipped, when, and what it was for. Written for the marketing post as
much as for us — so it says what changed for the person using the app, not
what changed in the files.

---

## 1.1.0 — submitted 7 October 2026

Build 10. The first paid version. Submitted with both subscriptions and the
subscription group in one review.

### New

**Tsumiki becomes a subscription.** $29.99 a year or $3.99 a month, in 175
countries. Three free days first, and nothing is taken away during them.
Anyone who had the app before this version keeps it, for nothing, for good —
that line is a constant in the code, not a promise in a blog post.

**The plans are always reachable.** From the You tab, under Subscription.
You do not have to be locked out to see what it costs, which means somebody
grandfathered can choose to pay and somebody three days in can decide early.

**Today says the whole date.** The weekday in full, with the date under it —
"WEDNESDAY / October 7th, 2026" — rather than a bare "7 OCT" you had to work
out for yourself.

**Progress opens on how you are doing.** An Overall view with your rate across
the last thirty days, which habits are going well, and which need work, with a
sentence saying what to do about each. It used to open on a chart you had to
interpret.

**Twenty-four habit colours**, up from six.

**The dock was rebuilt.** Two panes of clear glass: the habit that is up next
with its check-in orb, and the tabs under it, each lit with a halo in that
habit's colour.

**A check-in looks like water.** The card fills, with weight and a lit edge,
and the finished habit walks itself to the back of the hand.

**You can rename and remove the moments in your day** — they were fixed before.

### Fixed

**The crew streak counted days nobody turned up.** A day where every member
missed, but nobody had spent their grace, still added one. One crew read "1 day
strong" having not checked in for three days. A forgiven day now holds the
number where it is: still no reset, but no climb either.

**Neither scheduled job had ever run.** Habit reminders and the nightly streak
evaluation had been failing silently since 22 September — a malformed service
role key returning 401 behind a cron job that recorded every run as a success.
No reminder had ever been delivered. No streak had ever been evaluated.

**A crewmate's moment appeared in your own day.**

**The page jumped when you checked a habit in** — a refresh spinner firing on
every background refetch, not just on a pull.

**The paywall could not scroll**, so on a short screen the Terms of Use and
Privacy Policy links were off the bottom edge.

**Nudges needed a restart to show up.**

**The invite screen said things were unbuilt that were built.**

### Known, and deliberately shipped

**The notification quick actions are unverified.** "Check in" and "Heading out
now" are in the code and named in the App Store description, and no one has yet
confirmed they render on a real phone. The registration order was fixed after
submission; it is first in line for 1.2.

**Invite links do not open the app from a browser.** Universal links need the
Tsumiki domain, which is not registered. The invite screen says so plainly
rather than pretending.

---

## 1.0 — approved 28 September 2026, released October 2026

The free version. Moments, habits stacked onto them, crews of two to five
sharing one streak, nudges, and the never-miss-twice rule.

Rejected once on 27 September, as a beta build, under guideline 2.1(a): App
Review could not get past the sign-in. Tsumiki has no passwords, so the fix was
to tell them to use Sign in with Apple with any Apple ID. Approved the next
day.
