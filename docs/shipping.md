# Shipping a change

Two ways out to people, and the difference is whether the change is native.

---

## Over the air — minutes, no review

```bash
eas update --channel production --message "what changed"
```

JavaScript, TypeScript, copy, layout, images in `assets` — anything that ends
up in the bundle rather than in the binary. Apps pick it up on next launch.
No App Review, no build, no waiting.

Almost everything is this. The crew rename, the paywall's wording, the date on
Today, a streak rule, a fixed screen — all of it could have gone out the same
hour.

**Check what you are about to send:**

```bash
eas update --channel production --message "..." --dry-run
```

**If it goes wrong**, republish the previous one rather than scrambling a fix:

```bash
eas update:rollback --channel production
```

### What Apple allows

Bug fixes and improvements to an app that stays what it was reviewed as. Not a
way to ship a different product, add features that would change the rating, or
route around a rejection. Used for what it is for, it is normal and expected.

---

## A new build — days, with review

```bash
eas build --profile production --platform ios --auto-submit
```

Needed when the **native** side changes: a new native dependency, permissions,
the icon or splash, app.json config, an Expo SDK bump. Then: attach the build
to a version in App Store Connect, submit, wait 24–48 hours.

**Metadata alone needs neither.** Description, keywords, screenshots, What's
New, review notes and prices are edited in App Store Connect against the build
that is already there. The 3.1.2 rejection on 8 October was fixed this way in
minutes — the binary never changed.

---

## The thing that keeps the two honest

`runtimeVersion` is set to the **fingerprint** policy, which hashes everything
native. A bundle only ever lands on a build it is compatible with: change a
native dependency and the fingerprint changes, so old apps stop seeing new
bundles instead of crashing on them.

It is also why you cannot cheat. A native change cannot be pushed over the air
no matter how small it looks, because the fingerprint will not match.

---

## One catch, the first time

**expo-updates is itself a native dependency.** It was added on 8 October, so
the next production build is a normal submission. Updates only start working
for people running *that* build or later — anybody on build 10 or earlier will
never receive one, because their binary has no idea to ask.

So: ship one more build through review, and after that most things are a
command and a few minutes.

---

## Which channel

| Profile | Channel | Who |
|---|---|---|
| `production` | `production` | everyone on the App Store |
| `preview` | `preview` | internal builds |

`development`, `simulator` and `shots` have no channel and ignore updates
entirely, which is right — a dev build should run the code on your machine.
