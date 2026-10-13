# Weekend of 9–11 October — drafts

X post, a two-part slideshow, and a 30-second script. Nothing published until
you say so.

36 real commits across Friday, Saturday and Sunday. Every line below is checked
against git — hashes are in [changelog.md](changelog.md) and
`notes/build-log.md`.

**Rendered slides:** `~/Downloads/Tsumiki Posts/2026-10-12/slides/`

---

## Correction to the earlier draft

I had the paywall bug wrong, and the truth is a better story.

`copy.ts` before `3604d18`:

```ts
notNow: (days: number) => `Start my free ${days} days`,
```

and in `Paywall.tsx`:

```tsx
{onDismiss && (
  <TextButton label={dismissLabel ?? copy.paywall.notNow(TRIAL_DAYS)}
              onPress={onDismiss} />
)}
```

**"Start my free 3 days" was the dismiss button.** Not a purchase button — the
cancel button, wearing a trial's clothes. Tapping it took no payment, told Apple
nothing, wrote a date into my own database and closed the screen. Three days
later that date locked you out with no card on file and no way back in.

And `Subscribe`, directly above it, charged $29.99 with no trial at all, because
no introductory offer existed in App Store Connect.

---

## 1 · X / Twitter — quick list

**Status:** todo · **Image:** yours

> Tsumiki shipped Friday. Weekend of fixes.
>
> Added
> · real 3-day trial
> · in-app feedback
> · change email
> · change password
> · password reset
> · profile tab rebuilt
> · own sending domain
> · water check-in orb
> · buttons that press
>
> Fixed
> · trial button lied
> · cancel button mislabelled
> · subscribe charged instantly
> · two trial clocks
> · emails pointed localhost
> · reset token missing
> · lifetime read as locked
> · light mode washout
> · setup skipped steps
> · duplicate moments
> · silent routine errors
> · deletion left data
> · unreadable habit names
> · store products unreadable
> · no server notifications
>
> 36 commits. None of it visible from the outside.

---

## 2 · Two-part slideshow — personal account

Slides are rendered and numbered. Add the text in the TikTok editor so it can be
timed. Part 1 ends on the reveal; Part 2 opens by paying it off rather than
recapping, because a recap is where people leave.

### Part 1 — `slides/part1/`

| Slide | Text on screen |
|---|---|
| `01` | my habit app went live on the App Store on friday |
| `02` | saturday morning i opened it to look at the paywall |
| `03` | one button said: start my free 3 days |
| `04` | there was no free trial |
| `05` | i had never created one. not in App Store Connect. nowhere |
| `06` | and Subscribe, right above it, charged $29.99 instantly |
| `07` | but that isn't the bad part |
| `08` | the free trial button wasn't a purchase button |
| `09` | it was the cancel button |
| `10` | so what happened when you tapped it → part 2 |

### Part 2 — `slides/part2/`

| Slide | Text on screen |
|---|---|
| `01` | the free trial button on my paywall was the cancel button |
| `02` | tapping it took no payment. told apple nothing |
| `03` | it wrote a date into my own database and closed the screen |
| `04` | 3 days later that date locked you out of your own habits |
| `05` | no card on file. no renewal. no way back in |
| `06` | deleting it took four lines |
| `07` | finding everything that depended on it took the morning |
| `08` | the streak job had its own copy of the rule. they'd drifted apart |
| `09` | 36 commits this weekend. none of it visible from outside |
| `10` | it's called Tsumiki. build habits with your people |

---

## 3 · Thirty-second video — script

76 words. About 29 seconds at a normal pace. The pauses are doing work; don't
speed up to fit more in.

**Shot** — you talking, phone in hand. Cut to the paywall on "one button said"
and hold it through "cancel button". Back to you for the last line.

> My habit app went live on the App Store on Friday.
>
> Saturday I opened the paywall and one button said "start my free three days."
>
> There was no free trial. I'd never made one.
>
> And that button wasn't even a purchase button. It was the cancel button. Tap
> it and it locked you out three days later.
>
> Thirty-six commits later it works. Four months to build it. One weekend to
> learn what shipping means.

**Delivery** — land "It was the cancel button" flat, like you're still annoyed.
It's an admission, and admissions don't need help.

**If you run long**, cut "I'd never made one" — 68 words, still lands.
