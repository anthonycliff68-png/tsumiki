/**
 * When a push is allowed to go out.
 *
 * Pure functions, like the streak rules, because these decide whether someone's
 * phone buzzes at 3am. All times are minutes since local midnight.
 *
 * From the brief:
 *   - one reminder at each habit's expected moment: its anchor's time, its set
 *     time, or 8pm for an "anytime" habit;
 *   - nothing once the habit is checked in;
 *   - a nudge waits until the recipient's own moment if it has not come yet;
 *   - nothing inside quiet hours — it waits until they end;
 *   - "heading out now" buys thirty minutes of silence.
 */

export const ANYTIME_REMINDER_MINUTES = 20 * 60; // 8pm
/** How long after its moment a reminder is still worth sending. */
export const STALE_AFTER_MINUTES = 3 * 60;

/** "22:30" or "22:30:00" → 1350. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/**
 * Quiet hours usually wrap midnight — 22:00 to 07:00 is the default — so this
 * is not a simple between.
 */
export function isQuiet(minutes: number, quietStart: string, quietEnd: string): boolean {
  const start = toMinutes(quietStart);
  const end = toMinutes(quietEnd);
  if (start === end) return false; // no quiet hours
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

/**
 * The moment a push may actually be delivered: its own moment, unless that
 * falls inside quiet hours, in which case it waits for them to end.
 */
export function deliverableAt(
  momentMinutes: number,
  quietStart: string,
  quietEnd: string,
): number {
  if (!isQuiet(momentMinutes, quietStart, quietEnd)) return momentMinutes;
  const end = toMinutes(quietEnd);
  // A moment late at night waits for the morning; one early waits for today's end.
  return end;
}

export type ScheduleMode = 'after' | 'at' | 'any';

/** The minute of the day a habit is expected, or null when it has no moment. */
export function momentOf(
  mode: ScheduleMode,
  anchorTime: string | null,
  atTime: string | null,
): number | null {
  if (mode === 'after') return anchorTime ? toMinutes(anchorTime) : null;
  if (mode === 'at') return atTime ? toMinutes(atTime) : null;
  return ANYTIME_REMINDER_MINUTES;
}

export type ReminderInput = {
  mode: ScheduleMode;
  anchorTime: string | null;
  atTime: string | null;
  /** Minutes since local midnight, in the member's own time zone. */
  nowMinutes: number;
  weekday: number;
  daysOfWeek: number[];
  checkedIn: boolean;
  alreadySent: boolean;
  quietStart: string;
  quietEnd: string;
  /** Minutes left on a "heading out now", or 0. */
  pausedForMinutes: number;
};

export type ReminderDecision =
  | { send: true }
  | { send: false; reason: 'not-scheduled' | 'checked-in' | 'already-sent' | 'too-early' | 'stale' | 'quiet' | 'paused' };

/** Should this habit's reminder go out right now? */
export function shouldSendReminder(input: ReminderInput): ReminderDecision {
  if (!input.daysOfWeek.includes(input.weekday)) return { send: false, reason: 'not-scheduled' };
  if (input.checkedIn) return { send: false, reason: 'checked-in' };
  if (input.alreadySent) return { send: false, reason: 'already-sent' };
  if (input.pausedForMinutes > 0) return { send: false, reason: 'paused' };

  const moment = momentOf(input.mode, input.anchorTime, input.atTime);
  if (moment === null) return { send: false, reason: 'not-scheduled' };

  if (isQuiet(input.nowMinutes, input.quietStart, input.quietEnd)) {
    return { send: false, reason: 'quiet' };
  }

  const due = deliverableAt(moment, input.quietStart, input.quietEnd);
  if (input.nowMinutes < due) return { send: false, reason: 'too-early' };
  if (input.nowMinutes > due + STALE_AFTER_MINUTES) return { send: false, reason: 'stale' };
  return { send: true };
}

export type NudgeInput = {
  /** The recipient's own moment for the habit. */
  mode: ScheduleMode;
  anchorTime: string | null;
  atTime: string | null;
  nowMinutes: number;
  checkedIn: boolean;
  alreadyDelivered: boolean;
  quietStart: string;
  quietEnd: string;
  pausedForMinutes: number;
};

/**
 * A nudge sent before someone's moment waits for it: being told to walk at
 * 9am when you walk after lunch is just noise. Unlike a reminder it does not
 * go stale — a nudge is worth delivering late.
 */
export function shouldDeliverNudge(input: NudgeInput): ReminderDecision {
  if (input.checkedIn) return { send: false, reason: 'checked-in' };
  if (input.alreadyDelivered) return { send: false, reason: 'already-sent' };
  if (input.pausedForMinutes > 0) return { send: false, reason: 'paused' };
  if (isQuiet(input.nowMinutes, input.quietStart, input.quietEnd)) {
    return { send: false, reason: 'quiet' };
  }

  const moment = momentOf(input.mode, input.anchorTime, input.atTime);
  if (moment === null) return { send: true };

  const due = deliverableAt(moment, input.quietStart, input.quietEnd);
  if (input.nowMinutes < due) return { send: false, reason: 'too-early' };
  return { send: true };
}

/** "{sender} nudged you" / the body from the brief. */
export function nudgeBody(
  message: string,
  crewName: string,
  inCount: number,
  total: number,
  isLastOne: boolean,
): string {
  const head = `“${message}” ${crewName} is ${inCount} of ${total}.`;
  return isLastOne ? `${head} You're the last one.` : head;
}
