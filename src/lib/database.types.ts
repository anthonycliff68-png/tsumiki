export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      anchors: {
        Row: {
          color: string | null
          created_at: string
          ends_at: string | null
          id: string
          is_default: boolean
          label: string
          sort_order: number
          user_id: string
          usual_time: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_default?: boolean
          label: string
          sort_order?: number
          user_id: string
          usual_time: string
        }
        Update: {
          color?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_default?: boolean
          label?: string
          sort_order?: number
          user_id?: string
          usual_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "anchors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anchors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          local_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          local_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          local_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_members: {
        Row: {
          crew_id: string
          grace_used: boolean
          joined_at: string
          role: Database["public"]["Enums"]["crew_role"]
          user_id: string
        }
        Insert: {
          crew_id: string
          grace_used?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["crew_role"]
          user_id: string
        }
        Update: {
          crew_id?: string
          grace_used?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["crew_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          created_at: string
          created_by: string | null
          habit_id: string
          id: string
          name: string
          streak_best: number
          streak_current: number
          streak_updated_on: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          habit_id: string
          id?: string
          name: string
          streak_best?: number
          streak_current?: number
          streak_updated_on?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          habit_id?: string
          id?: string
          name?: string
          streak_best?: number
          streak_current?: number
          streak_updated_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crews_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_schedules: {
        Row: {
          anchor_id: string | null
          at_time: string | null
          created_at: string
          days_of_week: number[]
          habit_id: string
          id: string
          mode: Database["public"]["Enums"]["schedule_mode"]
          user_id: string
        }
        Insert: {
          anchor_id?: string | null
          at_time?: string | null
          created_at?: string
          days_of_week?: number[]
          habit_id: string
          id?: string
          mode: Database["public"]["Enums"]["schedule_mode"]
          user_id: string
        }
        Update: {
          anchor_id?: string | null
          at_time?: string | null
          created_at?: string
          days_of_week?: number[]
          habit_id?: string
          id?: string
          mode?: Database["public"]["Enums"]["schedule_mode"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_schedules_anchor_id_fkey"
            columns: ["anchor_id"]
            isOneToOne: false
            referencedRelation: "anchors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_schedules_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          archived_at: string | null
          color: string
          created_at: string
          crew_id: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          archived_at?: string | null
          color: string
          created_at?: string
          crew_id?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          archived_at?: string | null
          color?: string
          created_at?: string
          crew_id?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habits_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habits_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          crew_id: string
          expires_at: string
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          crew_id: string
          expires_at?: string
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          crew_id?: string
          expires_at?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_sends: {
        Row: {
          created_at: string
          id: string
          kind: string
          local_date: string
          ref_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          local_date: string
          ref_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          local_date?: string
          ref_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nudges: {
        Row: {
          created_at: string
          crew_id: string
          from_user: string
          id: string
          local_date: string
          message: string
          status: Database["public"]["Enums"]["nudge_status"]
          to_user: string
        }
        Insert: {
          created_at?: string
          crew_id: string
          from_user: string
          id?: string
          local_date: string
          message: string
          status?: Database["public"]["Enums"]["nudge_status"]
          to_user: string
        }
        Update: {
          created_at?: string
          crew_id?: string
          from_user?: string
          id?: string
          local_date?: string
          message?: string
          status?: Database["public"]["Enums"]["nudge_status"]
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "nudges_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudges_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          display_name: string
          id: string
          push_token: string | null
          quiet_end: string
          quiet_start: string
          timezone: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          display_name?: string
          id: string
          push_token?: string | null
          quiet_end?: string
          quiet_start?: string
          timezone?: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          display_name?: string
          id?: string
          push_token?: string | null
          quiet_end?: string
          quiet_start?: string
          timezone?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          from_user: string
          id: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          nudge_id: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          nudge_id: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          kind?: Database["public"]["Enums"]["reaction_kind"]
          nudge_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_nudge_id_fkey"
            columns: ["nudge_id"]
            isOneToOne: false
            referencedRelation: "nudges"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["report_kind"]
          reason: string
          ref_id: string | null
          reported_id: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["report_kind"]
          reason: string
          ref_id?: string | null
          reported_id?: string | null
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["report_kind"]
          reason?: string
          ref_id?: string | null
          reported_id?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      status_events: {
        Row: {
          created_at: string
          crew_id: string
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["status_kind"]
          user_id: string
        }
        Insert: {
          created_at?: string
          crew_id: string
          expires_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["status_kind"]
          user_id: string
        }
        Update: {
          created_at?: string
          crew_id?: string
          expires_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["status_kind"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_events_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "crew_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      crew_profiles: {
        Row: {
          avatar_color: string | null
          display_name: string | null
          id: string | null
        }
        Insert: {
          avatar_color?: string | null
          display_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_color?: string | null
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_read_habit: { Args: { p_habit: string }; Returns: boolean }
      create_crew: {
        Args: { p_habit_id: string; p_name: string }
        Returns: string
      }
      create_invite: { Args: { p_crew_id: string }; Returns: string }
      delete_my_account: { Args: never; Returns: undefined }
      generate_invite_code: { Args: never; Returns: string }
      get_invite: {
        Args: { p_code: string }
        Returns: {
          code: string
          crew_name: string
          expired: boolean
          habit_color: string
          habit_name: string
          is_full: boolean
          member_count: number
          streak_current: number
        }[]
      }
      is_blocked: { Args: { p_a: string; p_b: string }; Returns: boolean }
      is_crew_member: {
        Args: { p_crew: string; p_user?: string }
        Returns: boolean
      }
      is_crew_owner: {
        Args: { p_crew: string; p_user?: string }
        Returns: boolean
      }
      join_crew: {
        Args: {
          p_anchor_id?: string
          p_at_time?: string
          p_code: string
          p_mode: Database["public"]["Enums"]["schedule_mode"]
        }
        Returns: string
      }
      leave_crew: { Args: { p_crew_id: string }; Returns: undefined }
      run_notify_job: { Args: never; Returns: undefined }
      run_streak_job: { Args: never; Returns: undefined }
      shares_crew_with: { Args: { p_user: string }; Returns: boolean }
    }
    Enums: {
      crew_role: "owner" | "member"
      nudge_status: "sent" | "delivered" | "acted"
      reaction_kind: "thanks" | "same_time_tmrw"
      report_kind: "nudge" | "crew" | "profile"
      report_status: "open" | "reviewed" | "actioned"
      schedule_mode: "after" | "at" | "any"
      status_kind: "heading_out"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      crew_role: ["owner", "member"],
      nudge_status: ["sent", "delivered", "acted"],
      reaction_kind: ["thanks", "same_time_tmrw"],
      report_kind: ["nudge", "crew", "profile"],
      report_status: ["open", "reviewed", "actioned"],
      schedule_mode: ["after", "at", "any"],
      status_kind: ["heading_out"],
    },
  },
} as const
