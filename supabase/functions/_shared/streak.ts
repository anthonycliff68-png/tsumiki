/**
 * The "never miss twice" rule, as pure functions.
 *
 * Nothing in here touches the database or the clock: the nightly job reads the
 * state, calls evaluateDay for each date that has ended, and writes the result
 * back. That keeps the rule testable, which matters — it is the part of Tsumiki
 * most likely to break quietly.
 *
 * The rule, from the brief:
 *   - a member misses a scheduled day when they have no check-in for that
 *     local date;
 *   - the first miss is forgiven, and the crew's streak carries on;
 *   - a miss while that member's grace is already spent resets the streak to 0;
 *   - checking in gives a member their grace back;
 *   - the streak goes up by one for each day the crew gets through.
 *
 * A date nobody has scheduled — everyone's days_of_week skips it — is not a day
 * the crew can miss, so it passes without touching the streak.
 */

export type MemberState = {
  userId: string;
  /** 0 = Sunday … 6 = Saturday. */
  daysOfWeek: number[];
  graceUsed: boolean;
  /**
   * The day they joined, and the first day they are no longer in — null while
   * they still are. Both are needed because this judges days that have already
   * happened: "who is in this crew" is not the same question as "who was in it
   * on the third", and only the second one is any use a month later.
   */
  joinedOn?: string;
  leftOn?: string | null;
  /**
   * The first day they ever checked this habit in, null if they never have.
   *
   * Somebody who joins a crew on a forty-day run should not be able to end it
   * before they have done anything. They opt in by turning up, which needs no
   * grace period and no explaining.
   */
  startedOn?: string | null;
};

/** Was this member due on this date — in the crew, and past their first day? */
export function memberDueOn(member: MemberState, localDate: string): boolean {
  if (!member.daysOfWeek.includes(weekdayOf(localDate))) return false;
  if (member.joinedOn !== undefined && localDate < member.joinedOn) return false;
  if (member.leftOn !== undefined && member.leftOn !== null && localDate >= member.leftOn) {
    return false;
  }
  // Undefined means the caller is not tracking this, which is the old
  // behaviour and stays due. Null means they have genuinely never turned up.
  if (member.startedOn === null) return false;
  if (member.startedOn !== undefined && localDate < member.startedOn) return false;
  return true;
}

export type CrewState = {
  streakCurrent: number;
  streakBest: number;
  members: MemberState[];
};

export type DayOutcome = 'not-scheduled' | 'clean' | 'forgiven' | 'reset';

export type DayResult = {
  outcome: DayOutcome;
  streakCurrent: number;
  streakBest: number;
  members: MemberState[];
  /** Members who missed the day, whether forgiven or not. */
  missed: string[];
};

/** 0 = Sunday … 6 = Saturday, for a "YYYY-MM-DD" date. */
export function weekdayOf(localDate: string): number {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).getUTCDay();
}

/**
 * Apply one day to a crew.
 *
 * `checkedIn` is the set of member ids with a check-in for that local date.
 */
export function evaluateDay(
  crew: CrewState,
  localDate: string,
  checkedIn: ReadonlySet<string>,
): DayResult {
  const due = crew.members.filter((member) => memberDueOn(member, localDate));

  // Nobody was due: there is nothing here to miss.
  if (due.length === 0) {
    return {
      outcome: 'not-scheduled',
      streakCurrent: crew.streakCurrent,
      streakBest: crew.streakBest,
      members: crew.members,
      missed: [],
    };
  }

  const missed = due.filter((member) => !checkedIn.has(member.userId)).map((m) => m.userId);
  // A second miss in a row by anyone takes the whole crew's streak down.
  const resets = due.some((member) => !checkedIn.has(member.userId) && member.graceUsed);

  if (resets) {
    return {
      outcome: 'reset',
      streakCurrent: 0,
      streakBest: crew.streakBest,
      // A fresh streak starts with everyone's grace back.
      members: crew.members.map((member) => ({ ...member, graceUsed: false })),
      missed,
    };
  }

  const members = crew.members.map((member) => {
    if (checkedIn.has(member.userId)) return { ...member, graceUsed: false };
    if (missed.includes(member.userId)) return { ...member, graceUsed: true };
    return member;
  });

  // A day only counts if somebody actually did the thing.
  //
  // Grace exists so that one person's slip does not cost four other people
  // their streak. It is not meant to manufacture days out of nothing — and it
  // was: a crew where every single member missed, none of whom had spent
  // their grace yet, came out of here a day stronger. The Weekender crew read
  // "1 day strong" having not checked in for three days.
  //
  // So a forgiven day holds the number where it is. It does not reset — that
  // is still the second miss in a row — but it does not climb either.
  const turnedUp = due.some((member) => checkedIn.has(member.userId));
  const streakCurrent = turnedUp ? crew.streakCurrent + 1 : crew.streakCurrent;
  return {
    outcome: missed.length > 0 ? 'forgiven' : 'clean',
    streakCurrent,
    streakBest: Math.max(crew.streakBest, streakCurrent),
    members,
    missed,
  };
}

/** "2026-09-21" + 1 → "2026-09-22". */
export function nextDate(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** The local date in a given IANA time zone, right now. */
export function localDateIn(timezone: string, now: Date = new Date()): string {
  try {
    // en-CA gives YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    // An unknown time zone should not stop the job; treat it as UTC.
    return now.toISOString().slice(0, 10);
  }
}

/**
 * The most recent date that has finished for every member — the latest day the
 * crew can be judged on. Null when even the earliest time zone is still on the
 * crew's first day.
 */
export function lastCompletedDate(timezones: string[], now: Date = new Date()): string | null {
  if (timezones.length === 0) return null;
  // The member whose local date is earliest is the one still living the day.
  const earliest = timezones
    .map((timezone) => localDateIn(timezone, now))
    .sort()[0];
  if (!earliest) return null;
  return previousDate(earliest);
}

export function previousDate(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** Every date to judge, oldest first: the day after the last run, up to `through`. */
export function datesToEvaluate(
  lastEvaluated: string | null,
  through: string,
  limit = 30,
): string[] {
  // A crew that has never been evaluated gets nothing counted for it. The
  // streak measures days the crew got through *while the app was watching*;
  // reconstructing the days before that from check-in history invents a number
  // nobody earned, and makes it change retroactively whenever this code does.
  // The caller records the cursor and starts counting tomorrow.
  if (lastEvaluated === null) return [];

  const dates: string[] = [];
  let cursor = nextDate(lastEvaluated);
  while (cursor <= through && dates.length < limit) {
    dates.push(cursor);
    cursor = nextDate(cursor);
  }
  return dates;
}
