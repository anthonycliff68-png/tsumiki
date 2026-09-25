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
      progress: 'Progress',
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
    upNextLabel: 'Next up',
    everything: 'Everything today',
    bringForward: (habit: string) => `Bring ${habit} to the front`,
    afterAnchor: (anchor: string) => `After ${anchor}`,
    atTime: (time: string) => `At ${time}`,
    foldedAway: (count: number) => `${count} done`,
    leftToday: (count: number) => `${count} left`,
    showDone: 'Show them',
    hideDone: 'Hide them',
    fanHint: 'Swipe either way through the day',
    cardOf: (index: number, total: number) => `${index} of ${total}`,
    missed: 'Missed',
    later: 'Later',
    doneTag: 'Done',
    nothingLeft: 'Nothing left today.',
    anytimeShort: 'Anytime',
    emptyTitle: 'Nothing stacked yet',
    emptyBody: 'Add your first habit and it will show up here, hanging off a moment you already have.',
    addHabit: 'Add a habit',
    newHabit: 'New habit',
    backToToday: 'Back to today',
    viewingPast: 'You can still check in on a day you missed.',
    loadFailed: 'Could not load today. Pull down to try again.',
  },

  auth: {
    title: 'Build habits\nwith your\npeople.',
    blurb:
      'Stack new habits onto the routine you already have. Do them with friends who notice when you don\u2019t.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Send me a code',
    sending: 'Sending\u2026',
    linkSent: (email: string) =>
      `Check ${email} \u2014 the link signs you straight in. It lasts an hour.`,
    codeSent: (email: string) => `We sent a code to ${email}. It lasts an hour.`,
    codeLabel: 'Code from the email',
    codePlaceholder: '000000',
    verify: 'Sign in',
    verifying: 'Checking\u2026',
    resend: 'Send another code',
    resent: 'Sent. Check your email again.',
    codeTooShort: 'That looks too short \u2014 enter the whole code from the email.',
    codeWrong: 'That code is not right. Check the email and try again.',
    codeExpired: 'That code has expired or was already used. Ask for another.',
    linkAlsoWorks: 'The link in the same email works too.',
    useAnotherEmail: 'Use a different email',
    appleFailed:
      'Apple could not sign you in. Check you are signed in to your Apple Account on this device, then try again \u2014 or use your email instead.',
    appleHint: 'Sign in with Apple needs a development build; it does not work in Expo Go.',
    invalidEmail: 'That does not look like an email address.',
    genericError: 'Something went wrong. Try again in a moment.',
    notConfigured:
      'Supabase is not connected yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the dev server.',
    signingIn: 'Signing you in\u2026',
    linkExpired: 'That link has already been used, or it expired. Ask for a new one.',
    signOut: 'Sign out',
    deleteTitle: 'Delete your account',
    deleteBody:
      'Removes your account and everything in it: habits, routine, check-ins, nudges and crew memberships. There is no undo and no way to get it back.',
    deleteCrews:
      'A crew you started ends for everyone in it, because it is built on your habit. Crews you joined carry on without you.',
    deleteAction: 'Delete my account',
    deleteConfirm: 'Yes, delete everything',
    deleteFailed: 'Could not delete the account. Try again.',
    cancel: 'Cancel',
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
    whichDays: 'Which days?',
    everyDay: 'Every day',
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    needDay: 'Pick at least one day.',
    dayName: (day: number) =>
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day] ?? '',
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

  nudge: {
    /** The presets from the brief, in order. */
    presets: ['Walk time!', 'You\u2019re the last one', 'Don\u2019t leave us hanging', 'Streak\u2019s on you'],
    sendTitle: (name: string) => `Nudge ${name}`,
    sendSub: (moment: string, left: number) =>
      `${moment} \u00b7 ${left} left to keep the streak`,
    pick: 'Pick a nudge',
    writeYourOwn: 'Write your own',
    customPlaceholder: 'Say something short',
    rule: 'One nudge per friend per day. It lands at their moment, not before.',
    send: 'Send nudge',
    sent: 'Nudge sent',
    already: 'You have already nudged them today.',
    notAllowed: 'They have checked in already \u2014 nothing to nudge about.',
    nudge: 'Nudge',
    nudged: 'Nudged',
    cancel: 'Cancel',

    /** The received side. */
    inbox: (count: number) => `${count} nudge${count === 1 ? '' : 's'} for you`,
    from: (name: string) => `${name} nudged you`,
    openTitle: (name: string) => `${name}, the streak\u2019s on you.`,
    didIt: 'Did it? Check in',
    headingOut: 'Heading out now',
    onTheWay: (name: string) => `${name}\u2019s on the way`,
    youAreOnTheWay: 'You\u2019re on the way',
    skipToday: 'Skip today',
    streakSaved: 'Streak saved',
    thanks: 'Say thanks',
    thanksForPush: 'Thanks for the push',
    sameTimeTomorrow: 'Same time tmrw',
    thanked: 'Thanks sent',
    pushLater:
      'Push notifications arrive in a later build step; nudges show up in the app for now.',
  },

  invite: {
    title: 'Bring your crew',
    spots: (taken: number) => `${taken} of 5 spots`,
    whatTheyGet: 'What they\u2019ll get',
    share: 'Send invite',
    linkLabel: 'Join the crew',
    copyHint: 'The link works for seven days, or until the crew is full.',
    universalLinksLater:
      'The link needs the Tsumiki domain set up before it opens the app from a browser. Until then, share it with someone who already has the app.',
    full: 'This crew is full.',
    failed: 'Could not make an invite link.',

    joinTitle: (crew: string) => `Join ${crew}`,
    invitedBy: 'You\u2019ve been invited',
    yourMoment: 'You\u2019ll do it after\u2026',
    join: 'Join the crew',
    notNow: 'Not now',
    signInToJoin: 'Sign in to join',
    signInBlurb: 'Make an account first and we\u2019ll bring you straight back here.',
    notFound: 'That invite link has expired, or it never existed.',
    crewFull: 'This crew already has five people in it.',
    alreadyIn: 'You\u2019re already in this crew.',

    joinedTitle: 'You\u2019re in.',
    joinedBody: (crew: string, count: number) =>
      `${crew} is ${count} strong. Everyone can see you joined.`,
    firstCheckIn: 'First check-in',
    seeMyDay: 'See my day',
  },

  safety: {
    report: 'Report',
    block: 'Block',
    blockName: (name: string) => `Block ${name}`,
    reportTitle: 'Report this',
    reportBody:
      'Tell us what is wrong with it. Reports are read and acted on within 24 hours, and the person is not told who reported them.',
    reasonPlaceholder: 'What is wrong with it?',
    send: 'Send report',
    sent: 'Reported. Thank you \u2014 we will look at it within 24 hours.',
    blockTitle: (name: string) => `Block ${name}?`,
    blockBody:
      'They will not be able to nudge you, and their nudges stop arriving. You stay in any crew you share; leave it separately if you want out.',
    blockConfirm: 'Block them',
    blocked: 'Blocked',
    unblock: 'Unblock',
    blockedTitle: 'Blocked people',
    blockedEmpty: 'You have not blocked anyone.',
    cancel: 'Cancel',
    failed: 'That did not go through. Try again.',
    terms: 'Terms and community rules',
  },

  crews: {
    title: 'Crews',
    groupStreak: 'Group streak',
    best: (days: number) => `Best: ${days}`,
    daysStrong: (days: number) => (days === 1 ? 'Day strong' : 'Days strong'),
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
    invite: 'Invite',
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

  welcome: {
    // Three ideas, in the order someone needs them: what the app does, who
    // it is with, and the one rule that makes the streak mean anything.
    slides: [
      {
        step: 'One',
        title: 'Stack it onto\nyour day.',
        body:
          'You already wake up, make coffee, eat lunch. Hang a new habit off one of those and it has somewhere to live. \u201cAfter lunch, a fifteen minute walk\u201d is a plan. \u201cWalk more\u201d is a wish.',
      },
      {
        step: 'Two',
        title: 'Do it with\nyour people.',
        body:
          'Two to five friends share one streak. Everyone does the same habit, but each of you picks your own moment \u2014 your walk after lunch, theirs after work.',
      },
      {
        step: 'Three',
        title: 'Never\nmiss twice.',
        body:
          'Miss a day and it is forgiven; the streak survives. Miss again before you check in and it resets. That is what stops a bad week undoing a good month.',
      },
    ],
    next: 'Next',
    start: 'Get started',
    haveInvite: 'I have an invite link',
    slideOf: (i: number, total: number) => `Slide ${i} of ${total}`,
  },

  paywall: {
    // Two ways in: the week ran out, or they came looking. The screen is the
    // same; only the opening line changes, because "your week is up" is a
    // statement of fact and "keep it going" is an offer.
    overEyebrow: 'Your free week is up',
    overTitle: 'Keep going.',
    browsingEyebrow: 'Tsumiki',
    browsingTitle: 'Keep going.',
    trialLeft: (days: number) => `${days} day${days === 1 ? '' : 's'} left of your free week.`,

    // Their own numbers, as a receipt rather than a threat. Nothing here says
    // "don't lose this" — the point is to show what the week was worth.
    done: (count: number) =>
      `You have checked in ${count} time${count === 1 ? '' : 's'} so far.`,
    run: (days: number) => `Your longest run is ${days} day${days === 1 ? '' : 's'}.`,

    // The fear at a paywall in a habit app is "my streak is gone". Say
    // plainly that it is not, because the panic is what writes bad reviews.
    kept: 'Nothing is deleted. Your habits, your check-ins and your crews are all still here.',

    carriesOn: 'What carries on',
    features: [
      'Every habit, stacked onto your own routine',
      'Crews of up to five, sharing one streak',
      'Nudges when someone has not checked in',
      'Reminders at the moment you meant to do it',
      'Your day, week and month in Progress',
    ],

    annual: 'Annual',
    annualPrice: '$29.99 a year',
    annualAside: '$2.50 a month \u2014 save 37%',
    monthly: 'Monthly',
    monthlyPrice: '$3.99 a month',
    monthlyAside: 'Cancel whenever you like',

    subscribe: 'Subscribe',
    subscribing: 'One moment\u2026',
    restore: 'Restore purchases',
    restoring: 'Checking\u2026',
    restoredNone: 'No earlier purchase found on this Apple ID.',
    failed: 'That did not go through. Nothing has been charged.',

    // Apple requires the delete-account path to stay reachable, and locking
    // someone out of leaving would be indefensible anyway.
    terms: 'Cancel any time in Settings. Payment is taken by Apple.',
    deleteAccount: 'Delete my account',
  },

  schedule: {
    newMoment: 'New moment',
    editMoment: 'Edit moment',
    dismiss: 'Close without saving',
    colour: 'Colour',
    colourOption: (hex: string) => `Colour ${hex}`,
    deleteTitle: (label: string) => `Delete ${label}?`,
    deleteEmpty: 'Nothing is stacked on it, so nothing else changes.',
    deleteMoves: (count: number) =>
      `${count} habit${count === 1 ? '' : 's'} stacked here. Deleting keeps ${count === 1 ? 'it' : 'them'}, moved to Anytime.`,
    deleteConfirm: 'Delete it',
    endBeforeStart: 'It cannot end before it starts.',
    title: 'Your day',
    blurb:
      'The moments your habits stack onto. Give one an end time and it becomes a block, so the gaps around it are real.',
    add: 'Add a moment',
    label: 'What is it?',
    labelPlaceholder: 'Work',
    starts: 'Starts',
    ends: 'Ends',
    lasts: 'It lasts a while',
    lastsHint: 'A block like a work day or a school run.',
    noEnd: 'Just a moment',
    save: 'Save',
    delete: 'Remove',
    deleteHint: 'Habits stacked on it keep going; they just need a new moment.',
    needLabel: 'Give it a name.',
    needLaterEnd: 'It has to end after it starts.',
    empty: 'Nothing in your day yet.',
    done: 'Done',
    /** e.g. "9:00 – 5:30 pm" */
    range: (start: string, end: string) => `${start} \u2013 ${end}`,
  },

  stats: {
    needsWork: 'Needs work',
    goingWell: 'Going well',
    basedOn: (days: number) => `From the last ${days} days`,
    nothingToFix: 'Nothing is slipping right now. Check back after a rough week.',
    nothingGoingYet: 'No runs going yet. Three days in a row is where it starts.',
    openHabit: (name: string) => `Open ${name}`,
    doneOfDue: (done: number, due: number) => `${done} of ${due} days`,
    lately: (percent: number) => `${percent}% lately`,
    runDays: (days: number) => `${days} day run`,
    notDueToday: 'Not due today',
    everythingDone: 'Top line = everything done',
    advice: {
      stack: 'Floating with no cue. Stack it after something you already do.',
      dropDay: (weekday: string) =>
        `${weekday} are where this falls over. Drop that day and keep the rest.`,
      lighten: (anchor: string, load: number) =>
        `${anchor} is carrying ${load} habits. Move this one to a quieter moment.`,
      run: (days: number) => `${days} days straight. Leave this one alone.`,
    },
    legend: {
      done: 'Done',
      missed: 'Missed',
      future: 'To come',
      notDue: 'Not scheduled',
    },
    title: 'Progress',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    today: 'Today',
    thisWeek: 'This week',
    thisMonth: 'This month',
    earlier: 'Earlier',
    later: 'Later',
    doneOf: (done: number, due: number) => `${done} of ${due} due`,
    covering: (from: string, to: string) => `${from} \u2013 ${to}`,
    noneDue: 'Nothing was due yet in this window.',
    empty: 'Once you have checked a habit in, this fills up.',
    run: 'Run',
    best: 'Best',
    rate: 'Done',
    notDue: 'Grey days were never due.',
    nothingHere: 'Nothing was due in this period.',
    notYet: 'Not due yet',
    resetTitle: 'Reset your history',
    resetBody:
      'Deletes every check-in you have ever made. Your habits, routine and crews stay. There is no undo.',
    reset: 'Reset history',
    resetConfirm: 'Yes, delete every check-in',
    cancel: 'Cancel',
    storage:
      'Your habits and check-ins live in your Tsumiki account, not on this phone. Deleting the app signs you out; everything comes back when you sign in again.',
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
    showDone: (count: number) => `Show ${count} done`,
    showLess: 'Show less',
    unfoldStack: (count: number, label: string) =>
      `Show ${count} finished habit${count === 1 ? '' : 's'} under ${label}`,
    foldStack: (label: string) => `Hide the finished habits under ${label}`,
    addHabit: 'Add a habit',
    newHabit: 'New habit',
    solo: 'Solo',
    everyDay: 'every day',
    empty: 'Set your routine first and the day will fill in around it.',
    dragHint: 'Hold a habit to move it to another moment.',
    dropOnMoment: (label: string) => `after ${label.toLowerCase()}`,
    dropAtHour: (hour: string) => `at ${hour}`,
    moveFailed: 'Could not move it. Try again.',
  },

  you: {
    appearance: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    themeHint: 'System follows your phone\u2019s setting.',
    notifications: 'Notifications',
    on: 'Reminders and nudges are on for this phone.',
    simulator: 'Push needs a real phone; the simulator cannot receive it.',
    denied: 'Notifications are turned off. Turn them on in Settings to get reminders.',
    noProjectId:
      'Push needs an Expo project id. Run `npx eas init` once, then rebuild the app.',
    failed: 'Could not register this phone for push.',
    expoGo:
      'Expo Go cannot receive push at all \u2014 this needs a development build.',
    enable: 'Turn on notifications',
    turnOff: 'Stop notifications on this phone',
    quietHours: (start: string, end: string) => `Quiet hours ${start} to ${end}`,
    timezone: (zone: string) => `Times follow ${zone}`,
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
