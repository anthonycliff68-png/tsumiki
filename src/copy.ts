/**
 * Every string the user reads lives here, so wording is easy to change.
 * Keep the tone of the design canvas: plain, warm, short. Sentence case for
 * body copy; the display face does its own uppercasing.
 */

export const copy = {
  dock: {
    /** e.g. "UP NEXT · AFTER LUNCH" — the display face uppercases it anyway. */
    upNextAnchor: (anchor: string) => `Up next · ${anchor}`,
    upNextTime: (time: string) => `Up next · ${time}`,
    upNextAnytime: 'Up next · anytime today',
    /** e.g. "Lunch Loop · 1 of 3 done today" */
    crewProgress: (crew: string, done: number, total: number) =>
      `${crew} · ${done} of ${total} done today`,
    soloProgress: (done: number, total: number) =>
      `${done} of ${total} done today`,
    allDone: 'All done today. Nice stack.',
    checkInLabel: (habit: string) => `Check in: ${habit}`,
    checkedInLabel: (habit: string) => `Checked in: ${habit}`,
    tabs: {
      today: 'Today',
      myDay: 'My Day',
      crews: 'Crews',
      you: 'You',
    },
  },

  today: {
    doneCount: 'Done',
    upNext: 'Up next',
    allCrews: 'All crews',
    checkIn: 'Check in',
  },

  auth: {
    title: 'Build habits\nwith your\npeople.',
    blurb:
      'Stack new habits onto the routine you already have. Do them with friends who notice when you don\u2019t.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Send me a link',
    sending: 'Sending\u2026',
    linkSent: (email: string) =>
      `Check ${email} \u2014 the link signs you straight in. It lasts an hour.`,
    useAnotherEmail: 'Use a different email',
    appleHint: 'Sign in with Apple needs a development build; it does not work in Expo Go.',
    invalidEmail: 'That does not look like an email address.',
    genericError: 'Something went wrong. Try again in a moment.',
    notConfigured:
      'Supabase is not connected yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the dev server.',
    signingIn: 'Signing you in\u2026',
    linkExpired: 'That link has already been used, or it expired. Ask for a new one.',
    signOut: 'Sign out',
  },

  placeholder: {
    /** Used by the screens that are still scaffolding in build step 1. */
    comingSoon: 'Coming in a later build step.',
    today: 'The hero card, the done count and the up-next row land here.',
    myDay: 'The timeline: anchors, stacked habits, the NOW line and free-time gaps.',
    crews: 'Group streak, the last 7 days, and a tile per member.',
    you: 'Your routine anchors, quiet hours and notification settings.',
  },
} as const;
