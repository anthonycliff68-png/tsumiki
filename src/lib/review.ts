/**
 * When to show Apple's rating pop-up. Apple allows it three times a year and
 * decides itself whether it appears, so it is spent on a moment the app has
 * just helped: a brain dump kept, or a check-in on a third different day.
 * Never on an account's first day.
 */
const DAY = 86_400_000;

export function readyForReview(o: {
  why: 'dump' | 'checkin';
  accountCreated: string;
  now: number;
  checkinDays: string[];
}): boolean {
  if (!(o.now - Date.parse(o.accountCreated) >= DAY)) return false;
  return o.why === 'dump' || new Set(o.checkinDays).size >= 3;
}
