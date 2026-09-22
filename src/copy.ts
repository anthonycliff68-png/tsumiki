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
    checkedIn: 'Checked in',
    checkInLabel: (habit: string) => `Check in: ${habit}`,
    undoCheckIn: 'Undo check-in',
    undo: '\u00b7 Undo',
    editLabel: (habit: string) => `Edit ${habit}`,
    anytime: 'Anytime today',
    done: 'Done',
    open: 'Not yet',
    streakDays: (days: number) => `${days} day${days === 1 ? '' : 's'}`,
    allDone: 'Everything done today. Nice stack.',
    emptyTitle: 'Nothing stacked yet',
    emptyBody: 'Add your first habit and it will show up here, hanging off a moment you already have.',
    addHabit: 'Add a habit',
    loadFailed: 'Could not load today. Pull down to try again.',
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

  onboarding: {
    back: 'Back',
    skip: 'Skip',
    progress: (step: number, total: number) => `Step ${step} of ${total}`,

    routine: {
      eyebrow: 'Step 1 · Your routine',
      title: 'What does your\nday look like?',
      blurb: 'These are the moments your habits will stack onto. Rough times are fine.',
      addOwn: 'Your own',
      ownPlaceholder: 'Name this moment',
      timeLabel: (label: string) => `Change the time for ${label}`,
      removeLabel: (label: string) => `Remove ${label}`,
      next: 'Looks right',
      saving: 'Saving\u2026',
      failed: 'Could not save your routine. Try again.',
      pickTime: 'Pick a time',
      done: 'Done',
    },

    habit: {
      eyebrow: 'Step 2 · First habit',
      title: 'Start with\none.',
      blurb: 'Small beats ambitious. We matched each one to a moment in your day.',
      after: (anchor: string) => `After ${anchor}`,
      makeOwn: 'Make my own instead',
      add: (habit: string) => `Add ${habit}`,
      adding: 'Adding\u2026',
      failed: 'Could not add that habit. Try again.',
    },

    crew: {
      eyebrow: 'Step 3 · Your crew',
      title: 'It\u2019s in\nyour day.',
      justYou: 'Just you, for now',
      isNew: 'New',
      pitch: 'People who start with friends are way more likely to follow through',
      pitchBlurb: 'Invite 1\u20134 friends. Each picks their own moment. You all keep one streak.',
      invite: 'Invite friends',
      solo: 'Start solo for now',
      you: 'You',
    },
  },

  newHabit: {
    titleNew: 'New habit',
    titleEdit: 'Edit habit',
    cancel: 'Cancel',
    lands: 'Lands on My Day',
    iWill: 'I will\u2026',
    namePlaceholder: '15 min walk',
    when: 'When',
    modeAfter: 'After ___',
    modeAfterSub: 'Stack it',
    modeAt: 'At a time',
    modeAtSub: 'Set a clock',
    modeAny: 'Anytime',
    modeAnySub: 'No set spot',
    afterYou: 'After you\u2026',
    atTime: 'At',
    color: 'Colour',
    doItWith: 'Do it with',
    solo: 'Solo',
    crewsLater: 'Crews arrive in a later build step; every habit is solo for now.',
    save: 'Add to my day',
    saveEdit: 'Save changes',
    archive: 'Archive this habit',
    archived: 'Archived. It keeps its history and stops showing up.',
    needName: 'Give it a name first.',
    needAnchor: 'Pick the moment it stacks onto.',
    noAnchors: 'You have no moments yet. Set your routine first.',
    /** The live sentence under the name field. */
    previewAfter: (anchor: string, name: string) => `${anchor} \u2192 ${name}`,
    previewAt: (time: string, name: string) => `${time} \u2192 ${name}`,
    previewAny: (name: string) => `Anytime today \u2192 ${name}`,
  },

  crews: {
    title: 'Crews',
    groupStreak: 'Group streak',
    best: (days: number) => `Best: ${days}`,
    daysStrong: 'Days strong',
    startToday: 'Start it today',
    sameHabit: (habit: string) => `${habit}. Same habit, everyone\u2019s own anchor.`,
    crewLine: (inCount: number, total: number) => `Crew \u00b7 ${inCount} of ${total} in`,
    spots: (count: number) => `${count}/5 crew`,
    memberIn: 'In',
    memberNotYet: 'Not yet',
    you: 'You',
    checkIn: 'Check in',
    checkedIn: 'Checked in',
    graceUsed: 'One miss, back tomorrow keeps it alive',
    leave: 'Leave this crew',
    back: 'Back',
    invitesLater: 'Invite links arrive in a later build step, so a crew is just you for now.',
    nudgesLater: 'Nudging arrives in a later build step.',

    emptyTitle: 'No crews yet',
    emptyBody:
      'A crew is 2 to 5 people doing the same habit, each at their own moment, sharing one streak.',
    startCrew: 'Start a crew',
    pickHabit: 'Which habit?',
    noSoloHabits: 'Every habit you have is already in a crew. Add another one first.',
    nameIt: 'Name the crew',
    namePlaceholder: 'Lunch Loop',
    create: 'Create crew',
    needName: 'Give the crew a name.',
    cancel: 'Cancel',
  },

  myDay: {
    title: 'My day',
    editRoutine: 'Edit routine',
    habitCount: (count: number) => `${count} habit${count === 1 ? '' : 's'}`,
    breakdown: (stacked: number, solo: number) =>
      `${stacked} stacked \u00b7 ${solo} timed`,
    now: 'Now',
    anytime: 'Anytime today',
    freeHours: (hours: number) => `${hours} free hour${hours === 1 ? '' : 's'}`,
    addHabit: 'Add a habit',
    newHabit: 'New habit',
    solo: 'Solo',
    everyDay: 'every day',
    empty: 'Set your routine first and the day will fill in around it.',
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
