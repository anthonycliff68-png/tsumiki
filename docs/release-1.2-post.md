# Tsumiki 1.2 — release post

Everything here describes **build 12**, which is what 1.2.0 ships. The weekend's
paywall work (one trial clock instead of two, the grandfather line, the lifetime
fix) is **not in this release** — that is build 13 and needs a 1.2.1. Nothing
below claims it.

**Cards:** `~/Downloads/Tsumiki Posts/2026-10-13/1.2-card-1.png` and `-2.png`
(1080×1350, post as a two-card carousel in that order). Both describe what 1.2
*added*, not what the app does — the pitch belongs on the App Store page, not on
a what's-new card.

**Screenshots.** Two new captures, both taken today against build 12:
`12-feedback.png` and `13-appearance.png`. The rest of the board was **not**
regenerated, for a reason worth knowing: the simulator is signed into an account
with one habit, while the existing board came from the seeded screenshot account
(12 habits, 321 check-ins). Regenerating now would make every screen emptier
than what is already there. Sign the simulator into the seeded account and the
whole board can be redone in one command.

Two screens were captured and then left out. `11-account.png` and the rebuilt
You tab both print a real email address on screen, so neither belongs on a
public card. `11-account.png` has been deleted rather than committed.

**Specs:** [cards/1.2-card1.txt](cards/1.2-card1.txt), [cards/1.2-card2.txt](cards/1.2-card2.txt) —
edit the text, re-run `scripts/flyer.swift`, and the next release is five minutes.

---

## 1 · X / Twitter

> Tsumiki 1.2 is out.
>
> New
> · write in from inside the app
> · change your email and password
> · reset a forgotten password
> · You, rebuilt as a profile
> · check-in that fills like water
> · owners can rename a crew
>
> Fixed
> · time zones were never saved
> · setting up skipped two steps
> · duplicate moments on save
> · light mode washed out
> · deleting an account left data behind
> · back buttons that did nothing
> · a paywall promising a limit that wasn't there
>
> Free to try. On the App Store now.

**The time zone one is the real headline** if you want a sharper opener. Every
profile in the database said UTC, including people who had never been near it —
so quiet hours fired at the wrong hour and evening check-ins were filed against
the wrong day. It had been doing that since the schema was written. Swap the
first line for:

> Tsumiki 1.2 is out, and it fixes something that had been quietly wrong since
> the first day: nobody's time zone was ever being saved.

---

## 2 · Thirty-second video — script

74 words. About 29 seconds at a normal pace.

**Shot** — you to camera for the first and last lines, phone screen for the
middle. Cut to My Day on "your whole day", to the crew screen on "four friends".

> Tsumiki 1.2 is out.
>
> It's a habit app, but it hangs your habits off the day you already have. After
> coffee. After lunch. Not at 7am because an app said so.
>
> This update adds feedback from inside the app, proper account settings, and a
> check-in that fills like water.
>
> And it fixes a bug where nobody's time zone was ever saved. Which, for an app
> built on when you do things, is quite a bug.
>
> On the App Store now.

**Delivery** — the last line before the CTA is the one that earns the trust.
Say it like you think it's funny, not like you're apologising.

**If you run long**, cut "Not at 7am because an app said so." — 66 words.

---

## What is actually in 1.2

Roughly 75 commits since the 1.1 binary. The user-facing ones:

**New**
- Feedback screen, writing to a `feedback` table — `ec6dd71`
- Change email and password in-app; forgotten-password flow — `ec6dd71`
- Product-email opt-in, with an error when it fails to save — `1f9e209`
- You rebuilt as a profile rather than a settings list — `3c2ae22`
- Check-in orb fills like water — `9a5b900`, `54f47e1`, `996048d`, `bc64744`
- Buttons press back under the finger — `cd1123d`
- Done habits get out of the way on My Day — `9f2e38e`
- An owner can rename their crew — `80e9f60`

**Fixed**
- The time zone was never saved; every profile said UTC — `d4a89be`
- Back buttons that silently did nothing — `73cc26c`
- The paywall promised to lift a limit that did not exist — `529851a`
- Trial copy said something that wasn't true — `3604d18`
- Light mode washed out, because the bleed ignored the palette — `21b8b2d`
- Habit names unreadable before check-off — `af121e1`
- Setting up never reached steps 3 and 4 — `0c4c71d`, `8d0e50b`
- Saving the same moment twice made duplicates — `21f0ace`, `79fe4fe`
- Routine save errors said nothing useful — `3b95d01`
- Deleting an account left data on the device — `eff9edf`
- The first check-in screen congratulated you for nothing — `05b310c`
