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
      account_types: {
        Row: {
          id: string
          name_th: string
          normal_balance: string
        }
        Insert: {
          id: string
          name_th: string
          normal_balance: string
        }
        Update: {
          id?: string
          name_th?: string
          normal_balance?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          archived_at: string | null
          asset_liquidity: string | null
          cashflow_class: string | null
          created_at: string
          credit_limit: number | null
          id: string
          income_type: string | null
          is_active: boolean
          is_invested: boolean
          is_mortgage: boolean
          loan_annual_rate: number | null
          loan_interest_method: string | null
          loan_original_principal: number | null
          loan_start_date: string | null
          loan_term_months: number | null
          name: string
          opening_balance: number
          parent_id: string | null
          subtype: string | null
          taxable: boolean
          term: string | null
          type_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          asset_liquidity?: string | null
          cashflow_class?: string | null
          created_at?: string
          credit_limit?: number | null
          id?: string
          income_type?: string | null
          is_active?: boolean
          is_invested?: boolean
          is_mortgage?: boolean
          loan_annual_rate?: number | null
          loan_interest_method?: string | null
          loan_original_principal?: number | null
          loan_start_date?: string | null
          loan_term_months?: number | null
          name: string
          opening_balance?: number
          parent_id?: string | null
          subtype?: string | null
          taxable?: boolean
          term?: string | null
          type_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          asset_liquidity?: string | null
          cashflow_class?: string | null
          created_at?: string
          credit_limit?: number | null
          id?: string
          income_type?: string | null
          is_active?: boolean
          is_invested?: boolean
          is_mortgage?: boolean
          loan_annual_rate?: number | null
          loan_interest_method?: string | null
          loan_original_principal?: number | null
          loan_start_date?: string | null
          loan_term_months?: number | null
          name?: string
          opening_balance?: number
          parent_id?: string | null
          subtype?: string | null
          taxable?: boolean
          term?: string | null
          type_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "accounts_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "account_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          login_email: string
          recovery_email: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          login_email: string
          recovery_email: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          login_email?: string
          recovery_email?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      recurring_transaction_legs: {
        Row: {
          account_id: string
          amount: number | null
          created_at: string
          id: string
          note: string | null
          recurring_transaction_id: string
          sign: number
          user_id: string
        }
        Insert: {
          account_id: string
          amount?: number | null
          created_at?: string
          id?: string
          note?: string | null
          recurring_transaction_id: string
          sign: number
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number | null
          created_at?: string
          id?: string
          note?: string | null
          recurring_transaction_id?: string
          sign?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transaction_legs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transaction_legs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "recurring_transaction_legs_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          amount_mode: string
          auto_post: boolean
          created_at: string
          end_date: string | null
          flow_type: string
          frequency: string
          id: string
          is_active: boolean
          last_posted_date: string | null
          next_due_date: string
          note: string | null
          payee: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_mode: string
          auto_post?: boolean
          created_at?: string
          end_date?: string | null
          flow_type: string
          frequency: string
          id?: string
          is_active?: boolean
          last_posted_date?: string | null
          next_due_date: string
          note?: string | null
          payee?: string | null
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_mode?: string
          auto_post?: boolean
          created_at?: string
          end_date?: string | null
          flow_type?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_posted_date?: string | null
          next_due_date?: string
          note?: string | null
          payee?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_legs: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          note: string | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          transaction_id: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_legs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_legs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transaction_legs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          tag_id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          tag_id: string
          transaction_id: string
          user_id: string
        }
        Update: {
          tag_id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          occurred_on: string
          payee: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          occurred_on: string
          payee?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          occurred_on?: string
          payee?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_account_balances: {
        Row: {
          account_id: string | null
          balance: number | null
          name: string | null
          normal_balance: string | null
          type_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "account_types"
            referencedColumns: ["id"]
          },
        ]
      }
      v_balance_sheet: {
        Row: {
          total: number | null
          type_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "account_types"
            referencedColumns: ["id"]
          },
        ]
      }
      v_net_worth: {
        Row: {
          net_worth: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_account_balances_as_of: {
        Args: { as_of: string }
        Returns: {
          account_id: string
          balance: number
          name: string
          subtype: string
          type_id: string
          user_id: string
        }[]
      }
      fn_net_worth_history: {
        Args: { month_count?: number }
        Returns: {
          as_of: string
          net_worth: number
          total_assets: number
          total_liabilities: number
        }[]
      }
      get_login_email: { Args: { p_username: string }; Returns: string }
      is_username_available: { Args: { p_username: string }; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
