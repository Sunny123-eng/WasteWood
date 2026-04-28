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
      balances: {
        Row: {
          bank: number
          business_id: string
          cash: number
          id: number | null
          pk_id: string
          updated_at: string
        }
        Insert: {
          bank?: number
          business_id: string
          cash?: number
          id?: number | null
          pk_id?: string
          updated_at?: string
        }
        Update: {
          bank?: number
          business_id?: string
          cash?: number
          id?: number | null
          pk_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "balances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          paid_by: string
          payment_mode: string
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          created_by?: string | null
          date: string
          description: string
          id?: string
          paid_by: string
          payment_mode: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          paid_by?: string
          payment_mode?: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_archives: {
        Row: {
          business_id: string
          closed_by: string | null
          created_at: string
          data: Json
          id: string
          period_end: string
          period_label: string
          period_start: string
          totals: Json
        }
        Insert: {
          business_id: string
          closed_by?: string | null
          created_at?: string
          data: Json
          id?: string
          period_end: string
          period_label: string
          period_start: string
          totals: Json
        }
        Update: {
          business_id?: string
          closed_by?: string | null
          created_at?: string
          data?: Json
          id?: string
          period_end?: string
          period_label?: string
          period_start?: string
          totals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "monthly_archives_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          business_id: string
          contact: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments_made: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          payment_mode: string
          sawmill_id: string
          sawmill_name: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          payment_mode: string
          sawmill_id: string
          sawmill_name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          payment_mode?: string
          sawmill_id?: string
          sawmill_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_made_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_made_sawmill_id_fkey"
            columns: ["sawmill_id"]
            isOneToOne: false
            referencedRelation: "sawmills"
            referencedColumns: ["id"]
          },
        ]
      }
      payments_received: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          party_id: string
          party_name: string
          payment_mode: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          party_id: string
          party_name: string
          payment_mode: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          party_id?: string
          party_name?: string
          payment_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_received_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          requested_business_name: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          requested_business_name?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          requested_business_name?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          payment_mode: string
          quantity: number
          rate: number
          sawmill_id: string
          sawmill_name: string
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          payment_mode: string
          quantity: number
          rate: number
          sawmill_id: string
          sawmill_name: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          payment_mode?: string
          quantity?: number
          rate?: number
          sawmill_id?: string
          sawmill_name?: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_sawmill_id_fkey"
            columns: ["sawmill_id"]
            isOneToOne: false
            referencedRelation: "sawmills"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount: number
          bill_number: string
          business_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          party_id: string
          party_name: string
          payment_mode: string
          quantity: number
          rate: number
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          amount: number
          bill_number: string
          business_id: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          party_id: string
          party_name: string
          payment_mode: string
          quantity: number
          rate: number
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          amount?: number
          bill_number?: string
          business_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          party_id?: string
          party_name?: string
          payment_mode?: string
          quantity?: number
          rate?: number
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      sawmills: {
        Row: {
          business_id: string
          contact: string | null
          created_at: string
          default_rate: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          contact?: string | null
          created_at?: string
          default_rate?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          contact?: string | null
          created_at?: string
          default_rate?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sawmills_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          business_id: string
          default_expense_paid_by: string
          id: number | null
          partner_pct: number
          pk_id: string
          sunny_pct: number
          updated_at: string
        }
        Insert: {
          business_id: string
          default_expense_paid_by?: string
          id?: number | null
          partner_pct?: number
          pk_id?: string
          sunny_pct?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          default_expense_paid_by?: string
          id?: number | null
          partner_pct?: number
          pk_id?: string
          sunny_pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          person: string
          source: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          person: string
          source: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          person?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_to_business: {
        Args: { _business_id: string; _role: string; _user_id: string }
        Returns: undefined
      }
      approve_signup_as_business_admin: {
        Args: { _business_name: string; _user_id: string }
        Returns: string
      }
      can_admin_business: { Args: { _business_id: string }; Returns: boolean }
      can_insert_business: { Args: { _business_id: string }; Returns: boolean }
      can_read_business: { Args: { _business_id: string }; Returns: boolean }
      current_business_id: { Args: never; Returns: string }
      find_user_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_business_admin: { Args: { _business_id: string }; Returns: boolean }
      is_business_member: { Args: { _business_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      reject_signup: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "super_admin"
        | "business_admin"
        | "business_user"
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
        "user",
        "super_admin",
        "business_admin",
        "business_user",
      ],
    },
  },
} as const
