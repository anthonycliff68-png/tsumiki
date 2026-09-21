/**
 * Database types.
 *
 * Regenerate after every migration:
 *   npx supabase gen types typescript --project-id <your-project-ref> > src/lib/database.types.ts
 *
 * Written by hand for now, matching supabase/migrations exactly, because the
 * project has not been created yet.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_color: string;
          timezone: string;
          push_token: string | null;
          quiet_start: string;
          quiet_end: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_color?: string;
          timezone?: string;
          push_token?: string | null;
          quiet_start?: string;
          quiet_end?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_color?: string;
          timezone?: string;
          push_token?: string | null;
          quiet_start?: string;
          quiet_end?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      anchors: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          usual_time: string;
          sort_order: number;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          usual_time: string;
          sort_order?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          usual_time?: string;
          sort_order?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          color: string;
          crew_id: string | null;
          created_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          color: string;
          crew_id?: string | null;
          created_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          color?: string;
          crew_id?: string | null;
          created_at?: string;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      habit_schedules: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          mode: Database['public']['Enums']['schedule_mode'];
          anchor_id: string | null;
          at_time: string | null;
          days_of_week: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          mode: Database['public']['Enums']['schedule_mode'];
          anchor_id?: string | null;
          at_time?: string | null;
          days_of_week?: number[];
          created_at?: string;
        };
        Update: {
          id?: string;
          habit_id?: string;
          user_id?: string;
          mode?: Database['public']['Enums']['schedule_mode'];
          anchor_id?: string | null;
          at_time?: string | null;
          days_of_week?: number[];
          created_at?: string;
        };
        Relationships: [];
      };
      crews: {
        Row: {
          id: string;
          name: string;
          habit_id: string;
          created_by: string;
          created_at: string;
          streak_current: number;
          streak_best: number;
          streak_updated_on: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          habit_id: string;
          created_by: string;
          created_at?: string;
          streak_current?: number;
          streak_best?: number;
          streak_updated_on?: string | null;
        };
        Update: {
          /** Only `name` is writable by the app; streak fields are service-role only. */
          name?: string;
        };
        Relationships: [];
      };
      crew_members: {
        Row: {
          crew_id: string;
          user_id: string;
          joined_at: string;
          role: Database['public']['Enums']['crew_role'];
          grace_used: boolean;
        };
        Insert: {
          crew_id: string;
          user_id: string;
          joined_at?: string;
          role?: Database['public']['Enums']['crew_role'];
          grace_used?: boolean;
        };
        Update: never;
        Relationships: [];
      };
      checkins: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          local_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          local_date: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      nudges: {
        Row: {
          id: string;
          crew_id: string;
          from_user: string;
          to_user: string;
          message: string;
          local_date: string;
          created_at: string;
          status: Database['public']['Enums']['nudge_status'];
        };
        Insert: {
          id?: string;
          crew_id: string;
          from_user: string;
          to_user: string;
          message: string;
          local_date: string;
          created_at?: string;
          status?: Database['public']['Enums']['nudge_status'];
        };
        Update: never;
        Relationships: [];
      };
      reactions: {
        Row: {
          id: string;
          nudge_id: string;
          from_user: string;
          kind: Database['public']['Enums']['reaction_kind'];
          created_at: string;
        };
        Insert: {
          id?: string;
          nudge_id: string;
          from_user: string;
          kind: Database['public']['Enums']['reaction_kind'];
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      invites: {
        Row: {
          code: string;
          crew_id: string;
          created_by: string;
          created_at: string;
          expires_at: string;
          uses: number;
        };
        Insert: {
          code: string;
          crew_id: string;
          created_by: string;
          created_at?: string;
          expires_at?: string;
          uses?: number;
        };
        Update: never;
        Relationships: [];
      };
      status_events: {
        Row: {
          id: string;
          crew_id: string;
          user_id: string;
          kind: Database['public']['Enums']['status_kind'];
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          crew_id: string;
          user_id: string;
          kind?: Database['public']['Enums']['status_kind'];
          created_at?: string;
          expires_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      /** Crewmates' name and colour. Nothing else about them is readable. */
      crew_profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_color: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_crew_member: {
        Args: { p_crew: string; p_user?: string };
        Returns: boolean;
      };
      is_crew_owner: {
        Args: { p_crew: string; p_user?: string };
        Returns: boolean;
      };
      shares_crew_with: {
        Args: { p_user: string };
        Returns: boolean;
      };
      can_read_habit: {
        Args: { p_habit: string };
        Returns: boolean;
      };
    };
    Enums: {
      schedule_mode: 'after' | 'at' | 'any';
      crew_role: 'owner' | 'member';
      nudge_status: 'sent' | 'delivered' | 'acted';
      reaction_kind: 'thanks' | 'same_time_tmrw';
      status_kind: 'heading_out';
    };
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

export type Profile = Tables<'profiles'>;
export type Anchor = Tables<'anchors'>;
export type Habit = Tables<'habits'>;
export type HabitSchedule = Tables<'habit_schedules'>;
export type Crew = Tables<'crews'>;
export type CrewMember = Tables<'crew_members'>;
export type Checkin = Tables<'checkins'>;
export type Nudge = Tables<'nudges'>;
export type Invite = Tables<'invites'>;
export type StatusEvent = Tables<'status_events'>;
