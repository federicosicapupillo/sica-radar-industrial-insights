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
      contact_attempts: {
        Row: {
          contact_date: string
          contact_type: string | null
          contacted_company: string | null
          contacted_phone: string | null
          created_at: string
          id: string
          indicated_owner_email: string | null
          indicated_owner_name: string | null
          indicated_owner_phone: string | null
          is_owner_confirmed: boolean | null
          is_tenant_confirmed: boolean | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          opportunity_id: string | null
          outcome: string | null
          owner_contact_provided: boolean | null
          person_role: string | null
          person_spoken_to: string | null
          radar_candidate_id: string | null
          updated_at: string
        }
        Insert: {
          contact_date?: string
          contact_type?: string | null
          contacted_company?: string | null
          contacted_phone?: string | null
          created_at?: string
          id?: string
          indicated_owner_email?: string | null
          indicated_owner_name?: string | null
          indicated_owner_phone?: string | null
          is_owner_confirmed?: boolean | null
          is_tenant_confirmed?: boolean | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          owner_contact_provided?: boolean | null
          person_role?: string | null
          person_spoken_to?: string | null
          radar_candidate_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_date?: string
          contact_type?: string | null
          contacted_company?: string | null
          contacted_phone?: string | null
          created_at?: string
          id?: string
          indicated_owner_email?: string | null
          indicated_owner_name?: string | null
          indicated_owner_phone?: string | null
          is_owner_confirmed?: boolean | null
          is_tenant_confirmed?: boolean | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          opportunity_id?: string | null
          outcome?: string | null
          owner_contact_provided?: boolean | null
          person_role?: string | null
          person_spoken_to?: string | null
          radar_candidate_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      measurement_drafts: {
        Row: {
          address: string | null
          city: string | null
          client_name: string | null
          compatibility_score: number | null
          compatibility_status: string | null
          converted_to_opportunity: boolean
          created_at: string
          estimated_height: number | null
          geo_area_sqm: number | null
          geo_feature_type: string | null
          geojson_data: Json | null
          google_earth_url: string | null
          google_maps_url: string | null
          id: string
          industrial_area: string | null
          latitude: number | null
          longitude: number | null
          measured_covered_sqm: number | null
          measured_length: number | null
          measured_width: number | null
          measured_yard_sqm: number | null
          measurement_confidence: string | null
          measurement_notes: string | null
          measurement_source: string | null
          missing_data: Json | null
          near_highway_required: boolean | null
          near_port_required: boolean | null
          offices_status: string | null
          opportunity_id: string | null
          province: string | null
          required_truck_access: boolean | null
          search_name: string | null
          suggested_next_action: string | null
          target_covered_sqm: number | null
          target_height: number | null
          target_notes: string | null
          target_yard_sqm: number | null
          truck_access_status: string | null
          updated_at: string
          uploaded_file_name: string | null
          uploaded_file_url: string | null
          visual_notes: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_name?: string | null
          compatibility_score?: number | null
          compatibility_status?: string | null
          converted_to_opportunity?: boolean
          created_at?: string
          estimated_height?: number | null
          geo_area_sqm?: number | null
          geo_feature_type?: string | null
          geojson_data?: Json | null
          google_earth_url?: string | null
          google_maps_url?: string | null
          id?: string
          industrial_area?: string | null
          latitude?: number | null
          longitude?: number | null
          measured_covered_sqm?: number | null
          measured_length?: number | null
          measured_width?: number | null
          measured_yard_sqm?: number | null
          measurement_confidence?: string | null
          measurement_notes?: string | null
          measurement_source?: string | null
          missing_data?: Json | null
          near_highway_required?: boolean | null
          near_port_required?: boolean | null
          offices_status?: string | null
          opportunity_id?: string | null
          province?: string | null
          required_truck_access?: boolean | null
          search_name?: string | null
          suggested_next_action?: string | null
          target_covered_sqm?: number | null
          target_height?: number | null
          target_notes?: string | null
          target_yard_sqm?: number | null
          truck_access_status?: string | null
          updated_at?: string
          uploaded_file_name?: string | null
          uploaded_file_url?: string | null
          visual_notes?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_name?: string | null
          compatibility_score?: number | null
          compatibility_status?: string | null
          converted_to_opportunity?: boolean
          created_at?: string
          estimated_height?: number | null
          geo_area_sqm?: number | null
          geo_feature_type?: string | null
          geojson_data?: Json | null
          google_earth_url?: string | null
          google_maps_url?: string | null
          id?: string
          industrial_area?: string | null
          latitude?: number | null
          longitude?: number | null
          measured_covered_sqm?: number | null
          measured_length?: number | null
          measured_width?: number | null
          measured_yard_sqm?: number | null
          measurement_confidence?: string | null
          measurement_notes?: string | null
          measurement_source?: string | null
          missing_data?: Json | null
          near_highway_required?: boolean | null
          near_port_required?: boolean | null
          offices_status?: string | null
          opportunity_id?: string | null
          province?: string | null
          required_truck_access?: boolean | null
          search_name?: string | null
          suggested_next_action?: string | null
          target_covered_sqm?: number | null
          target_height?: number | null
          target_notes?: string | null
          target_yard_sqm?: number | null
          truck_access_status?: string | null
          updated_at?: string
          uploaded_file_name?: string | null
          uploaded_file_url?: string | null
          visual_notes?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          address: string | null
          already_for_sale: string | null
          asking_price: number | null
          call_notes: string | null
          call_outcome: string | null
          city: string | null
          client_name: string | null
          commercial_notes: string | null
          compatibility_score: number | null
          compatibility_status: string | null
          contact_name: string | null
          covered_sqm: number | null
          created_at: string
          email: string | null
          estimated_height: number | null
          geo_area_sqm: number | null
          geo_feature_type: string | null
          geojson_data: Json | null
          geometry_data: Json | null
          google_earth_url: string | null
          google_maps_url: string | null
          has_crane: boolean | null
          has_offices: boolean | null
          id: string
          indicated_owner_email: string | null
          indicated_owner_name: string | null
          indicated_owner_phone: string | null
          industrial_area: string | null
          intended_use: string | null
          internal_height: number | null
          is_owner_confirmed: boolean | null
          is_tenant_confirmed: boolean | null
          kml_file_url: string | null
          last_call_date: string | null
          last_measured_at: string | null
          latitude: number | null
          loading_doors: number | null
          longitude: number | null
          measured_covered_sqm: number | null
          measured_length: number | null
          measured_width: number | null
          measured_yard_sqm: number | null
          measurement_confidence: string | null
          measurement_draft_id: string | null
          measurement_notes: string | null
          measurement_source: string | null
          missing_data: Json | null
          near_highway: boolean | null
          near_industrial_area: boolean | null
          near_port: boolean | null
          next_action: string | null
          next_action_date: string | null
          occupant_company_name: string | null
          occupant_contact_confidence: string | null
          occupant_contact_notes: string | null
          occupant_contact_source: string | null
          occupant_contact_status: string | null
          occupant_email: string | null
          occupant_phone: string | null
          occupant_reference_name: string | null
          occupant_reference_role: string | null
          occupant_sign_name: string | null
          occupant_website: string | null
          occupying_company: string | null
          office_sqm: number | null
          offices_status: string | null
          opportunity_status: string
          owner_contact_provided: boolean | null
          person_role: string | null
          person_spoken_to: string | null
          phone: string | null
          possible_owner: string | null
          power_available: string | null
          priority: string
          property_condition: string | null
          property_type: string | null
          province: string | null
          region: string | null
          rent_price: number | null
          search_name: string | null
          source_type: string | null
          source_url: string | null
          spans_count: number | null
          suggested_next_action: string | null
          target_covered_sqm: number | null
          target_covered_sqm_max: number | null
          target_intended_use: string | null
          target_internal_height: number | null
          target_near_highway: boolean | null
          target_near_port: boolean | null
          target_notes: string | null
          target_truck_access: boolean | null
          target_yard_sqm: number | null
          target_zone: string | null
          title: string
          truck_access: boolean | null
          truck_access_status: string | null
          updated_at: string
          uploaded_file_url: string | null
          visual_notes: string | null
          yard_sqm: number | null
        }
        Insert: {
          address?: string | null
          already_for_sale?: string | null
          asking_price?: number | null
          call_notes?: string | null
          call_outcome?: string | null
          city?: string | null
          client_name?: string | null
          commercial_notes?: string | null
          compatibility_score?: number | null
          compatibility_status?: string | null
          contact_name?: string | null
          covered_sqm?: number | null
          created_at?: string
          email?: string | null
          estimated_height?: number | null
          geo_area_sqm?: number | null
          geo_feature_type?: string | null
          geojson_data?: Json | null
          geometry_data?: Json | null
          google_earth_url?: string | null
          google_maps_url?: string | null
          has_crane?: boolean | null
          has_offices?: boolean | null
          id?: string
          indicated_owner_email?: string | null
          indicated_owner_name?: string | null
          indicated_owner_phone?: string | null
          industrial_area?: string | null
          intended_use?: string | null
          internal_height?: number | null
          is_owner_confirmed?: boolean | null
          is_tenant_confirmed?: boolean | null
          kml_file_url?: string | null
          last_call_date?: string | null
          last_measured_at?: string | null
          latitude?: number | null
          loading_doors?: number | null
          longitude?: number | null
          measured_covered_sqm?: number | null
          measured_length?: number | null
          measured_width?: number | null
          measured_yard_sqm?: number | null
          measurement_confidence?: string | null
          measurement_draft_id?: string | null
          measurement_notes?: string | null
          measurement_source?: string | null
          missing_data?: Json | null
          near_highway?: boolean | null
          near_industrial_area?: boolean | null
          near_port?: boolean | null
          next_action?: string | null
          next_action_date?: string | null
          occupant_company_name?: string | null
          occupant_contact_confidence?: string | null
          occupant_contact_notes?: string | null
          occupant_contact_source?: string | null
          occupant_contact_status?: string | null
          occupant_email?: string | null
          occupant_phone?: string | null
          occupant_reference_name?: string | null
          occupant_reference_role?: string | null
          occupant_sign_name?: string | null
          occupant_website?: string | null
          occupying_company?: string | null
          office_sqm?: number | null
          offices_status?: string | null
          opportunity_status?: string
          owner_contact_provided?: boolean | null
          person_role?: string | null
          person_spoken_to?: string | null
          phone?: string | null
          possible_owner?: string | null
          power_available?: string | null
          priority?: string
          property_condition?: string | null
          property_type?: string | null
          province?: string | null
          region?: string | null
          rent_price?: number | null
          search_name?: string | null
          source_type?: string | null
          source_url?: string | null
          spans_count?: number | null
          suggested_next_action?: string | null
          target_covered_sqm?: number | null
          target_covered_sqm_max?: number | null
          target_intended_use?: string | null
          target_internal_height?: number | null
          target_near_highway?: boolean | null
          target_near_port?: boolean | null
          target_notes?: string | null
          target_truck_access?: boolean | null
          target_yard_sqm?: number | null
          target_zone?: string | null
          title: string
          truck_access?: boolean | null
          truck_access_status?: string | null
          updated_at?: string
          uploaded_file_url?: string | null
          visual_notes?: string | null
          yard_sqm?: number | null
        }
        Update: {
          address?: string | null
          already_for_sale?: string | null
          asking_price?: number | null
          call_notes?: string | null
          call_outcome?: string | null
          city?: string | null
          client_name?: string | null
          commercial_notes?: string | null
          compatibility_score?: number | null
          compatibility_status?: string | null
          contact_name?: string | null
          covered_sqm?: number | null
          created_at?: string
          email?: string | null
          estimated_height?: number | null
          geo_area_sqm?: number | null
          geo_feature_type?: string | null
          geojson_data?: Json | null
          geometry_data?: Json | null
          google_earth_url?: string | null
          google_maps_url?: string | null
          has_crane?: boolean | null
          has_offices?: boolean | null
          id?: string
          indicated_owner_email?: string | null
          indicated_owner_name?: string | null
          indicated_owner_phone?: string | null
          industrial_area?: string | null
          intended_use?: string | null
          internal_height?: number | null
          is_owner_confirmed?: boolean | null
          is_tenant_confirmed?: boolean | null
          kml_file_url?: string | null
          last_call_date?: string | null
          last_measured_at?: string | null
          latitude?: number | null
          loading_doors?: number | null
          longitude?: number | null
          measured_covered_sqm?: number | null
          measured_length?: number | null
          measured_width?: number | null
          measured_yard_sqm?: number | null
          measurement_confidence?: string | null
          measurement_draft_id?: string | null
          measurement_notes?: string | null
          measurement_source?: string | null
          missing_data?: Json | null
          near_highway?: boolean | null
          near_industrial_area?: boolean | null
          near_port?: boolean | null
          next_action?: string | null
          next_action_date?: string | null
          occupant_company_name?: string | null
          occupant_contact_confidence?: string | null
          occupant_contact_notes?: string | null
          occupant_contact_source?: string | null
          occupant_contact_status?: string | null
          occupant_email?: string | null
          occupant_phone?: string | null
          occupant_reference_name?: string | null
          occupant_reference_role?: string | null
          occupant_sign_name?: string | null
          occupant_website?: string | null
          occupying_company?: string | null
          office_sqm?: number | null
          offices_status?: string | null
          opportunity_status?: string
          owner_contact_provided?: boolean | null
          person_role?: string | null
          person_spoken_to?: string | null
          phone?: string | null
          possible_owner?: string | null
          power_available?: string | null
          priority?: string
          property_condition?: string | null
          property_type?: string | null
          province?: string | null
          region?: string | null
          rent_price?: number | null
          search_name?: string | null
          source_type?: string | null
          source_url?: string | null
          spans_count?: number | null
          suggested_next_action?: string | null
          target_covered_sqm?: number | null
          target_covered_sqm_max?: number | null
          target_intended_use?: string | null
          target_internal_height?: number | null
          target_near_highway?: boolean | null
          target_near_port?: boolean | null
          target_notes?: string | null
          target_truck_access?: boolean | null
          target_yard_sqm?: number | null
          target_zone?: string | null
          title?: string
          truck_access?: boolean | null
          truck_access_status?: string | null
          updated_at?: string
          uploaded_file_url?: string | null
          visual_notes?: string | null
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
