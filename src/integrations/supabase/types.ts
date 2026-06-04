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
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          opportunity_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          opportunity_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          opportunity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          notes: string | null
          opportunity_id: string | null
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          opportunity_id?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          opportunity_id?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          address: string | null
          already_for_sale: string | null
          asking_price: number | null
          city: string | null
          commercial_notes: string | null
          contact_name: string | null
          covered_sqm: number | null
          created_at: string
          email: string | null
          google_earth_url: string | null
          google_maps_url: string | null
          has_crane: boolean | null
          has_offices: boolean | null
          id: string
          intended_use: string | null
          internal_height: number | null
          latitude: number | null
          loading_doors: number | null
          longitude: number | null
          near_highway: boolean | null
          near_industrial_area: boolean | null
          near_port: boolean | null
          next_action: string | null
          next_action_date: string | null
          occupying_company: string | null
          office_sqm: number | null
          opportunity_status: string
          phone: string | null
          possible_owner: string | null
          power_available: string | null
          priority: string
          property_condition: string | null
          property_type: string | null
          province: string | null
          region: string | null
          rent_price: number | null
          source_type: string | null
          source_url: string | null
          spans_count: number | null
          title: string
          truck_access: boolean | null
          updated_at: string
          yard_sqm: number | null
        }
        Insert: {
          address?: string | null
          already_for_sale?: string | null
          asking_price?: number | null
          city?: string | null
          commercial_notes?: string | null
          contact_name?: string | null
          covered_sqm?: number | null
          created_at?: string
          email?: string | null
          google_earth_url?: string | null
          google_maps_url?: string | null
          has_crane?: boolean | null
          has_offices?: boolean | null
          id?: string
          intended_use?: string | null
          internal_height?: number | null
          latitude?: number | null
          loading_doors?: number | null
          longitude?: number | null
          near_highway?: boolean | null
          near_industrial_area?: boolean | null
          near_port?: boolean | null
          next_action?: string | null
          next_action_date?: string | null
          occupying_company?: string | null
          office_sqm?: number | null
          opportunity_status?: string
          phone?: string | null
          possible_owner?: string | null
          power_available?: string | null
          priority?: string
          property_condition?: string | null
          property_type?: string | null
          province?: string | null
          region?: string | null
          rent_price?: number | null
          source_type?: string | null
          source_url?: string | null
          spans_count?: number | null
          title: string
          truck_access?: boolean | null
          updated_at?: string
          yard_sqm?: number | null
        }
        Update: {
          address?: string | null
          already_for_sale?: string | null
          asking_price?: number | null
          city?: string | null
          commercial_notes?: string | null
          contact_name?: string | null
          covered_sqm?: number | null
          created_at?: string
          email?: string | null
          google_earth_url?: string | null
          google_maps_url?: string | null
          has_crane?: boolean | null
          has_offices?: boolean | null
          id?: string
          intended_use?: string | null
          internal_height?: number | null
          latitude?: number | null
          loading_doors?: number | null
          longitude?: number | null
          near_highway?: boolean | null
          near_industrial_area?: boolean | null
          near_port?: boolean | null
          next_action?: string | null
          next_action_date?: string | null
          occupying_company?: string | null
          office_sqm?: number | null
          opportunity_status?: string
          phone?: string | null
          possible_owner?: string | null
          power_available?: string | null
          priority?: string
          property_condition?: string | null
          property_type?: string | null
          province?: string | null
          region?: string | null
          rent_price?: number | null
          source_type?: string | null
          source_url?: string | null
          spans_count?: number | null
          title?: string
          truck_access?: boolean | null
          updated_at?: string
          yard_sqm?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
