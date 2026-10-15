/**
 * Which days in a crew's week count as done.
 *
 * Pulled out of the query that draws the strip because it had been getting the
 * question wrong in a way that was invisible until somebody left: it judged
 * every past day against *today's* roster.
 *
 * Two different lies came out of that. Remove somebody and the days they had
 * missed turned complete, so the history flattered the crew. Add somebody and
 * every day before they joined went empty, because they had no check-ins for
 * days they were not there — a crew twelve days into a streak would show an
 * empty week beside the number twelve.
 *
 * The rule here is the one the nightly job already uses, in
 * crew_member_due_on: somebody counts for a day if they had joined by then and
 * had not yet left. Keeping the two in step is the whole point — the strip and
 * the streak sit a thumb's width apart on the same screen, and when they
 * disagree the number is the one nobody believes.
 */

export type WeekMember = {
  userId: string;
  /** crew_members.joined_at, ISO. */
  joinedAt: string;
  /** crew_members.left_on, a local date, or null for somebody still in. */
  leftOn: string | null;
};

/**
 * Was this person in the crew on this day?
 *
 * Dates are compared as strings on purpose. They are all local dates in
 * YYYY-MM-DD, which sorts correctly as text, and parsing them into Date
 * objects would drag the device's time zone into a question that has nothing
 * to do with it.
 */
export function wasInCrewOn(member: WeekMember, day: string): boolean {
  const joined = member.joinedAt.slice(0, 10);
  if (joined > day) return false;
  if (member.leftOn !== null && day >= member.leftOn) return false;
  return true;
}

/**
 * Did the crew get through this day?
 *
 * True only when everybody who was in the crew that day checked in. A day with
 * nobody in the crew is not complete: there is no crew to have done it.
 */
export function dayComplete(
  members: WeekMember[],
  day: string,
  checkedInThatDay: ReadonlySet<string>,
): boolean {
  const present = members.filter((m) => wasInCrewOn(m, day));
  if (present.length === 0) return false;
  return present.every((m) => checkedInThatDay.has(m.userId));
}
