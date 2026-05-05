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
      feedback_entries: {
        Row: {
          created_at: string
          id: string
          message: string
          page_path: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          page_path?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          page_path?: string | null
        }
        Relationships: []
      }
      cached_listings: {
        Row: {
          brand: string | null
          boat_type: string | null
          cabins: number | null
          created_at: string
          description: string | null
          engine_hours: number | null
          engine_info: string | null
          equipment: string[] | null
          fuel_type: string | null
          hull_material: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          length_feet: number | null
          location: string | null
          model: string | null
          price_eur: number | null
          scraped_at: string
          segment: string | null
          source: string | null
          specs_raw: Json | null
          title: string
          url: string
          year: number | null
        }
        Insert: {
          brand?: string | null
          boat_type?: string | null
          cabins?: number | null
          created_at?: string
          description?: string | null
          engine_hours?: number | null
          engine_info?: string | null
          equipment?: string[] | null
          fuel_type?: string | null
          hull_material?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          length_feet?: number | null
          location?: string | null
          model?: string | null
          price_eur?: number | null
          scraped_at?: string
          segment?: string | null
          source?: string | null
          specs_raw?: Json | null
          title: string
          url: string
          year?: number | null
        }
        Update: {
          brand?: string | null
          boat_type?: string | null
          cabins?: number | null
          created_at?: string
          description?: string | null
          engine_hours?: number | null
          engine_info?: string | null
          equipment?: string[] | null
          fuel_type?: string | null
          hull_material?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          length_feet?: number | null
          location?: string | null
          model?: string | null
          price_eur?: number | null
          scraped_at?: string
          segment?: string | null
          source?: string | null
          specs_raw?: Json | null
          title?: string
          url?: string
          year?: number | null
        }
        Relationships: []
      }
      marinas: {
        Row: {
          berth_types: string[] | null
          boat_length_range: string | null
          confidence_score: number | null
          country: string
          created_at: string
          currency: string | null
          id: string
          last_updated: string | null
          name: string
          notes: string | null
          price_per_meter_year: number | null
          region: string | null
          scraped_at: string
          source: string | null
          website: string | null
        }
        Insert: {
          berth_types?: string[] | null
          boat_length_range?: string | null
          confidence_score?: number | null
          country: string
          created_at?: string
          currency?: string | null
          id?: string
          last_updated?: string | null
          name: string
          notes?: string | null
          price_per_meter_year?: number | null
          region?: string | null
          scraped_at?: string
          source?: string | null
          website?: string | null
        }
        Update: {
          berth_types?: string[] | null
          boat_length_range?: string | null
          confidence_score?: number | null
          country?: string
          created_at?: string
          currency?: string | null
          id?: string
          last_updated?: string | null
          name?: string
          notes?: string | null
          price_per_meter_year?: number | null
          region?: string | null
          scraped_at?: string
          source?: string | null
          website?: string | null
        }
        Relationships: []
      }
      scrape_cron_state: {
        Row: {
          id: number
          last_run_at: string | null
          next_start_idx: number
        }
        Insert: {
          id?: number
          last_run_at?: string | null
          next_start_idx?: number
        }
        Update: {
          id?: number
          last_run_at?: string | null
          next_start_idx?: number
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
