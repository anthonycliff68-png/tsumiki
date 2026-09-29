/**
 * Friendly names for the generated row types, and the small rules about how a
 * person is shown.
 *
 * These live outside database.types.ts because that file is overwritten every
 * time the schema changes (`npm run db:types`).
 */
import type { Enums, Tables } from '@/lib/database.types';

export type Profile = Tables<'profiles'>;
export type Anchor = Tables<'anchors'>;
export type Habit = Tables<'habits'>;
export type HabitSchedule = Tables<'habit_schedules'>;
export type Crew = Tables<'crews'>;
export type CrewMember = Tables<'crew_members'>;
export type Checkin = Tables<'checkins'>;
export type Nudge = Tables<'nudges'>;
export type Reaction = Tables<'reactions'>;
export type Invite = Tables<'invites'>;
export type StatusEvent = Tables<'status_events'>;

/** Name and colour of someone you share a crew with. Nothing else is readable. */
export type CrewProfile = Tables<'crew_profiles'>;

export type ScheduleMode = Enums<'schedule_mode'>;
export type CrewRole = Enums<'crew_role'>;
export type NudgeStatus = Enums<'nudge_status'>;
export type ReactionKind = Enums<'reaction_kind'>;
export type StatusKind = Enums<'status_kind'>;

/**
 * What to call someone.
 *
 * display_name defaults to the empty string and is only ever written once, so
 * plenty of real people have never had one set: anyone who signed in by email
 * was never asked, and Apple returns no name at all to someone who declined to
 * share it. `?? 'Someone'` does not catch that — null coalescing passes an
 * empty string straight through, which renders as a blank crew tile and a push
 * that reads " nudged you". Every read of a name goes through here instead.
 *
 * The fallback word is passed in rather than imported: this file has to stay
 * readable by `node --test`, which does not resolve the `@/` alias.
 */
export function personName(name: string | null | undefined, fallback: string): string {
  return name?.trim() || fallback;
}

/**
 * The two letters standing in for a face. Two words give their initials, one
 * word gives its first two letters — "Ada Lovelace" is AL, "Ada" is AD.
 */
export function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '??';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return trimmed.slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

/**
 * What to draw inside someone's disc: their emoji if they picked one, their
 * initials otherwise.
 *
 * One rule in one place because there are three discs — the crew tile, the
 * nudge sheet and the profile header — and they were each deriving initials
 * their own way. A stale one is not a crash, just a member who looks like a
 * different person depending on the screen.
 */
export function faceOf(name: string, emoji: string | null | undefined): string {
  return emoji?.trim() || initialsOf(name);
}
