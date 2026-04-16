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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          doctor: string
          id: string
          patient_id: string
          scheduled_at: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          doctor: string
          id?: string
          patient_id: string
          scheduled_at: string
          status?: string
          type?: string
        }
        Update: {
          created_at?: string
          doctor?: string
          id?: string
          patient_id?: string
          scheduled_at?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          critical_level: number
          current_stock: number
          id: string
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          critical_level?: number
          current_stock?: number
          id?: string
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          critical_level?: number
          current_stock?: number
          id?: string
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          change_amount: number
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          reason: string | null
        }
        Insert: {
          change_amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          reason?: string | null
        }
        Update: {
          change_amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_logs: {
        Row: {
          answer: string | null
          created_at: string | null
          id: number
          patient_id: string | null
          patient_name: string | null
          unknown_question: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string | null
          id?: number
          patient_id?: string | null
          patient_name?: string | null
          unknown_question?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string | null
          id?: number
          patient_id?: string | null
          patient_name?: string | null
          unknown_question?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          is_processed: boolean | null
          patient_id: string
          platform: string | null
          sender_type: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_processed?: boolean | null
          patient_id: string
          platform?: string | null
          sender_type: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_processed?: boolean | null
          patient_id?: string
          platform?: string | null
          sender_type?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          patient_id: string | null
          read: boolean
          remind_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          patient_id?: string | null
          read?: boolean
          remind_at?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          patient_id?: string | null
          read?: boolean
          remind_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      patient_reminders: {
        Row: {
          created_at: string
          id: string
          is_done: boolean
          note: string
          patient_id: string
          remind_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_done?: boolean
          note?: string
          patient_id: string
          remind_at: string
        }
        Update: {
          created_at?: string
          id?: string
          is_done?: boolean
          note?: string
          patient_id?: string
          remind_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          age: string | null
          appointment_date: string | null
          complaint: string | null
          created_at: string
          doctor: string | null
          event_id: string | null
          facebook_id: string | null
          gender: string | null
          id: string
          instagram_id: string | null
          internal_notes: string | null
          is_ai_active: boolean | null
          location: string | null
          name: string
          notes: string | null
          phone: string | null
          platform: string | null
          reminder_active: boolean
          reminder_date: string | null
          reminder_sent: boolean | null
          status: string
          surname: string | null
          tags: Json | null
          updated_at: string
          web_session_id: string | null
        }
        Insert: {
          age?: string | null
          appointment_date?: string | null
          complaint?: string | null
          created_at?: string
          doctor?: string | null
          event_id?: string | null
          facebook_id?: string | null
          gender?: string | null
          id: string
          instagram_id?: string | null
          internal_notes?: string | null
          is_ai_active?: boolean | null
          location?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          platform?: string | null
          reminder_active?: boolean
          reminder_date?: string | null
          reminder_sent?: boolean | null
          status?: string
          surname?: string | null
          tags?: Json | null
          updated_at?: string
          web_session_id?: string | null
        }
        Update: {
          age?: string | null
          appointment_date?: string | null
          complaint?: string | null
          created_at?: string
          doctor?: string | null
          event_id?: string | null
          facebook_id?: string | null
          gender?: string | null
          id?: string
          instagram_id?: string | null
          internal_notes?: string | null
          is_ai_active?: boolean | null
          location?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          platform?: string | null
          reminder_active?: boolean
          reminder_date?: string | null
          reminder_sent?: boolean | null
          status?: string
          surname?: string | null
          tags?: Json | null
          updated_at?: string
          web_session_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string | null
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string | null
          user_id: string
        }
        Insert: {
          auth_key?: string | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_translations: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          lipsync_job_id: string | null
          lipsync_url: string | null
          mode: string
          output_url: string | null
          status: string
          subtitle_url: string | null
          target_language: string
          target_language_label: string
          transcript_text: string | null
          translated_text: string | null
          video_id: string
          voice_clone_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lipsync_job_id?: string | null
          lipsync_url?: string | null
          mode?: string
          output_url?: string | null
          status?: string
          subtitle_url?: string | null
          target_language: string
          target_language_label: string
          transcript_text?: string | null
          translated_text?: string | null
          video_id: string
          voice_clone_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lipsync_job_id?: string | null
          lipsync_url?: string | null
          mode?: string
          output_url?: string | null
          status?: string
          subtitle_url?: string | null
          target_language?: string
          target_language_label?: string
          transcript_text?: string | null
          translated_text?: string | null
          video_id?: string
          voice_clone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_translations_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_translations_voice_clone_id_fkey"
            columns: ["voice_clone_id"]
            isOneToOne: false
            referencedRelation: "voice_clones"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_size: number | null
          id: string
          original_url: string
          source_language: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_size?: number | null
          id?: string
          original_url: string
          source_language?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_size?: number | null
          id?: string
          original_url?: string
          source_language?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_clones: {
        Row: {
          created_at: string
          elevenlabs_voice_id: string | null
          error_message: string | null
          id: string
          name: string
          sample_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          elevenlabs_voice_id?: string | null
          error_message?: string | null
          id?: string
          name?: string
          sample_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          elevenlabs_voice_id?: string | null
          error_message?: string | null
          id?: string
          name?: string
          sample_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_omnichannel_message: {
        Args: {
          p_external_id: string
          p_message: string
          p_name: string
          p_platform: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "staff"
        | "doctor"
        | "pending"
        | "premium"
        | "premium_plus"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "staff",
        "doctor",
        "pending",
        "premium",
        "premium_plus",
      ],
    },
  },
} as const
