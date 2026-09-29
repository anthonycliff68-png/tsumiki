/**
 * Friendly names for the generated row types.
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
