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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      application_attachments: {
        Row: {
          application_id: string
          created_at: string
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_attachments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          authority_to_transact: string | null
          channel: string
          channel_type_other: string | null
          channel_types: string[] | null
          citizenship: string | null
          conflict_details: string | null
          conflict_of_interest: boolean | null
          contact_person_name: string
          contact_person_surname: string
          created_at: string
          credit_check_consent: boolean | null
          customer_number: string | null
          date_of_birth: string | null
          declaration_date: string | null
          designation_capacity: string | null
          dsf_d_number: string | null
          dsf_fss_user: boolean | null
          email1: string
          email2: string | null
          fss_user: boolean | null
          gender: string | null
          id: string
          is_active: boolean
          last_active_date: string | null
          last_active_month: string | null
          physical_address: string | null
          postal_address: string | null
          registration_number: string | null
          responsibilities: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          signature_text: string | null
          signed_at_location: string | null
          status: string
          submitted_by: string | null
          team_leader_id: string | null
          telephone_cell: string
          telephone_work: string | null
          territory_id: string | null
          trading_name: string
          updated_at: string
          vat_number: string | null
          witness1_name: string | null
          witness2_name: string | null
          zone_id: string | null
        }
        Insert: {
          authority_to_transact?: string | null
          channel?: string
          channel_type_other?: string | null
          channel_types?: string[] | null
          citizenship?: string | null
          conflict_details?: string | null
          conflict_of_interest?: boolean | null
          contact_person_name: string
          contact_person_surname: string
          created_at?: string
          credit_check_consent?: boolean | null
          customer_number?: string | null
          date_of_birth?: string | null
          declaration_date?: string | null
          designation_capacity?: string | null
          dsf_d_number?: string | null
          dsf_fss_user?: boolean | null
          email1: string
          email2?: string | null
          fss_user?: boolean | null
          gender?: string | null
          id?: string
          is_active?: boolean
          last_active_date?: string | null
          last_active_month?: string | null
          physical_address?: string | null
          postal_address?: string | null
          registration_number?: string | null
          responsibilities?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_text?: string | null
          signed_at_location?: string | null
          status?: string
          submitted_by?: string | null
          team_leader_id?: string | null
          telephone_cell: string
          telephone_work?: string | null
          territory_id?: string | null
          trading_name: string
          updated_at?: string
          vat_number?: string | null
          witness1_name?: string | null
          witness2_name?: string | null
          zone_id?: string | null
        }
        Update: {
          authority_to_transact?: string | null
          channel?: string
          channel_type_other?: string | null
          channel_types?: string[] | null
          citizenship?: string | null
          conflict_details?: string | null
          conflict_of_interest?: boolean | null
          contact_person_name?: string
          contact_person_surname?: string
          created_at?: string
          credit_check_consent?: boolean | null
          customer_number?: string | null
          date_of_birth?: string | null
          declaration_date?: string | null
          designation_capacity?: string | null
          dsf_d_number?: string | null
          dsf_fss_user?: boolean | null
          email1?: string
          email2?: string | null
          fss_user?: boolean | null
          gender?: string | null
          id?: string
          is_active?: boolean
          last_active_date?: string | null
          last_active_month?: string | null
          physical_address?: string | null
          postal_address?: string | null
          registration_number?: string | null
          responsibilities?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_text?: string | null
          signed_at_location?: string | null
          status?: string
          submitted_by?: string | null
          team_leader_id?: string | null
          telephone_cell?: string
          telephone_work?: string | null
          territory_id?: string | null
          trading_name?: string
          updated_at?: string
          vat_number?: string | null
          witness1_name?: string | null
          witness2_name?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      de_territories: {
        Row: {
          id: string
          territory_id: string
          user_id: string
        }
        Insert: {
          id?: string
          territory_id: string
          user_id: string
        }
        Update: {
          id?: string
          territory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "de_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      territories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          monthly_target: number | null
          name: string
          updated_at: string
          weekly_target: number | null
          year_target: number | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          monthly_target?: number | null
          name: string
          updated_at?: string
          weekly_target?: number | null
          year_target?: number | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          monthly_target?: number | null
          name?: string
          updated_at?: string
          weekly_target?: number | null
          year_target?: number | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "territories_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          id: string
          title: string
          message: string
          type: string
          application_id: string | null
          read: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          title: string
          message: string
          type: string
          application_id?: string | null
          read?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          message?: string
          type?: string
          application_id?: string | null
          read?: boolean
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          }
        ]
      }
      team_leaders: {
        Row: {
          id: string
          name: string
          zone_id: string | null
          territory_id: string | null
          cluster: string | null
          target_dsf_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          zone_id?: string | null
          territory_id?: string | null
          cluster?: string | null
          target_dsf_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          zone_id?: string | null
          territory_id?: string | null
          cluster?: string | null
          target_dsf_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_leaders_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_leaders_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          }
        ]
      }
      dsf_records: {
        Row: {
          id: string
          application_id: string | null
          dsf_name: string
          d_number: string
          fss_user: boolean
          team_leader_id: string | null
          zone_id: string | null
          territory_id: string | null
          fss_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id?: string | null
          dsf_name: string
          d_number: string
          fss_user?: boolean
          team_leader_id?: string | null
          zone_id?: string | null
          territory_id?: string | null
          fss_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string | null
          dsf_name?: string
          d_number?: string
          fss_user?: boolean
          team_leader_id?: string | null
          zone_id?: string | null
          territory_id?: string | null
          fss_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsf_records_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsf_records_team_leader_id_fkey"
            columns: ["team_leader_id"]
            isOneToOne: false
            referencedRelation: "team_leaders"
            referencedColumns: ["id"]
          }
        ]
      }
      zones: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "de"
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
      app_role: ["admin", "de"],
    },
  },
} as const
