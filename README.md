# Tsumiki

Build habits with your people, one stack at a time.

The full brief — scope, data model, rules, build order — is in [CLAUDE.md](CLAUDE.md).
The design source of truth is the canvas linked there.

## Where things are

```
src/
  app/              expo-router routes. (tabs)/ holds the four tabs.
  components/       Bleed, Dock, CheckInOrb, ProgressRing, icons, Screen shell
  constants/brand   APP_NAME and the tagline
  data/fake.ts      static stand-in data (build step 1 only)
  copy.ts           every user-facing string
  theme.ts          design tokens: colours, fonts, radii, spacing
assets/fonts/       Archivo Condensed Black + DM Sans 400/500/700
```

## Running it

```bash
npm install
npx expo start --go
```

Then open the project in **Expo Go** on your phone — scan the QR code, or press
`i` for the iOS simulator. Expo Go is enough through build step 4.

From build step 5 (push notifications and deep links) you need a **development
build** instead:

```bash
npx expo run:ios      # local build, needs Xcode
npx expo run:android  # local build, needs Android Studio
npx expo start        # then this, without --go
```

## Connecting Supabase

The schema lives in `supabase/migrations` and has not been applied anywhere yet.
To set it up:

1. Create a project at [supabase.com](https://supabase.com/dashboard) (any region near you).
2. Copy `.env.example` to `.env.local` and fill in the **Project URL** and the
   **publishable key** (`sb_publishable_…`) from Project Settings → API Keys.
   Never put the secret key in this file — `EXPO_PUBLIC_*` values are baked into
   the app bundle. Older projects show a legacy `anon` key starting `eyJ`
   instead; that works too, as `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Link the CLI and push the migrations:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npm run db:push
   ```

4. Regenerate the types from the live schema (they are hand-written until you do):

   ```bash
   npm run db:types
   ```

5. In the dashboard, under Authentication → URL Configuration, set the site URL
   to `tsumiki://` and add these redirect URLs:
   `tsumiki://`, `tsumiki://auth-callback`, and — for Expo Go — `exp://127.0.0.1:8081`
   plus `exp://<your-mac's-LAN-IP>:8081`.
6. For Sign in with Apple, enable the Apple provider under Authentication →
   Providers and add `com.tsumiki.app` as the client ID. It only works in a
   development build, not in Expo Go.

Restart the dev server after changing `.env.local` — Expo inlines those values
at bundle time.

## Cloud builds (EAS)

`eas.json` has the build profiles but no environment values — the Supabase URL
and key are deliberately kept out of git. Before a cloud build, set them on the
EAS side:

```bash
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value <url> --environment development
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <key> --environment development
```

iOS builds for a physical device need a paid Apple Developer account. The
`simulator` profile does not.

## Checks

```bash
npm run typecheck
```
