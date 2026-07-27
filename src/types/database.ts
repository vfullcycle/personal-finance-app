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
      budget_baseline_items: {
        Row: {
          account_id: string
          amount_per_period_satang: number
          created_at: string
          growth_percent_per_year: number
          id: string
          is_active: boolean
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount_per_period_satang: number
          created_at?: string
          growth_percent_per_year?: number
          id?: string
          is_active?: boolean
          period: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount_per_period_satang?: number
          created_at?: string
          growth_percent_per_year?: number
          id?: string
          is_active?: boolean
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_baseline_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_baseline_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
        ]
      }
      budget_schedule_items: {
        Row: {
          account_id: string
          amount_per_occurrence_satang: number
          created_at: string
          direction: string
          frequency: string
          growth_percent_per_year: number
          id: string
          name: string
          start_month: number | null
          updated_at: string
          user_id: string
          year_end: number
          year_start: number
        }
        Insert: {
          account_id: string
          amount_per_occurrence_satang: number
          created_at?: string
          direction: string
          frequency: string
          growth_percent_per_year?: number
          id?: string
          name: string
          start_month?: number | null
          updated_at?: string
          user_id: string
          year_end: number
          year_start: number
        }
        Update: {
          account_id?: string
          amount_per_occurrence_satang?: number
          created_at?: string
          direction?: string
          frequency?: string
          growth_percent_per_year?: number
          id?: string
          name?: string
          start_month?: number | null
          updated_at?: string
          user_id?: string
          year_end?: number
          year_start?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_schedule_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_schedule_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
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
      savings_goals: {
        Row: {
          account_id: string
          created_at: string
          id: string
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          name: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
        ]
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
      tax_brackets: {
        Row: {
          config_version_id: string
          id: string
          max_income_satang: number | null
          min_income_satang: number
          rate_percent: number
          seq: number
        }
        Insert: {
          config_version_id: string
          id?: string
          max_income_satang?: number | null
          min_income_satang: number
          rate_percent: number
          seq: number
        }
        Update: {
          config_version_id?: string
          id?: string
          max_income_satang?: number | null
          min_income_satang?: number
          rate_percent?: number
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_brackets_config_version_id_fkey"
            columns: ["config_version_id"]
            isOneToOne: false
            referencedRelation: "tax_config_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_brackets_config_version_id_fkey"
            columns: ["config_version_id"]
            isOneToOne: false
            referencedRelation: "v_tax_config_current"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_config_versions: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          life_health_combined_cap_satang: number
          note: string | null
          retirement_combined_cap_satang: number
          section48_2_exempt_tax_satang: number
          section48_2_rate_percent: number
          section48_2_threshold_satang: number
          tax_year: number
          version_no: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from: string
          id?: string
          life_health_combined_cap_satang?: number
          note?: string | null
          retirement_combined_cap_satang: number
          section48_2_exempt_tax_satang: number
          section48_2_rate_percent: number
          section48_2_threshold_satang: number
          tax_year: number
          version_no: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          life_health_combined_cap_satang?: number
          note?: string | null
          retirement_combined_cap_satang?: number
          section48_2_exempt_tax_satang?: number
          section48_2_rate_percent?: number
          section48_2_threshold_satang?: number
          tax_year?: number
          version_no?: number
        }
        Relationships: []
      }
      tax_deduction_items: {
        Row: {
          calc_type: string
          cap_satang: number | null
          category: string
          config_version_id: string
          double_amount: boolean
          id: string
          key: string
          label_th: string
          life_health_group: boolean
          note: string | null
          percent_rate: number | null
          retirement_group: boolean
          sort_order: number
          unit_amount_satang: number | null
        }
        Insert: {
          calc_type: string
          cap_satang?: number | null
          category: string
          config_version_id: string
          double_amount?: boolean
          id?: string
          key: string
          label_th: string
          life_health_group?: boolean
          note?: string | null
          percent_rate?: number | null
          retirement_group?: boolean
          sort_order?: number
          unit_amount_satang?: number | null
        }
        Update: {
          calc_type?: string
          cap_satang?: number | null
          category?: string
          config_version_id?: string
          double_amount?: boolean
          id?: string
          key?: string
          label_th?: string
          life_health_group?: boolean
          note?: string | null
          percent_rate?: number | null
          retirement_group?: boolean
          sort_order?: number
          unit_amount_satang?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_deduction_items_config_version_id_fkey"
            columns: ["config_version_id"]
            isOneToOne: false
            referencedRelation: "tax_config_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_deduction_items_config_version_id_fkey"
            columns: ["config_version_id"]
            isOneToOne: false
            referencedRelation: "v_tax_config_current"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_expense_rules: {
        Row: {
          allow_actual: boolean
          alt_label: string | null
          alt_rate_percent: number | null
          cap_satang: number | null
          config_version_id: string
          default_rate_percent: number
          id: string
          income_type: string
          shared_group: string | null
          uses_category_table: boolean
        }
        Insert: {
          allow_actual?: boolean
          alt_label?: string | null
          alt_rate_percent?: number | null
          cap_satang?: number | null
          config_version_id: string
          default_rate_percent?: number
          id?: string
          income_type: string
          shared_group?: string | null
          uses_category_table?: boolean
        }
        Update: {
          allow_actual?: boolean
          alt_label?: string | null
          alt_rate_percent?: number | null
          cap_satang?: number | null
          config_version_id?: string
          default_rate_percent?: number
          id?: string
          income_type?: string
          shared_group?: string | null
          uses_category_table?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tax_expense_rules_config_version_id_fkey"
            columns: ["config_version_id"]
            isOneToOne: false
            referencedRelation: "tax_config_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_expense_rules_config_version_id_fkey"
            columns: ["config_version_id"]
            isOneToOne: false
            referencedRelation: "v_tax_config_current"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rental_expense_rates: {
        Row: {
          category_key: string
          config_version_id: string
          id: string
          label_th: string
          rate_percent: number
        }
        Insert: {
          category_key: string
          config_version_id: string
          id?: string
          label_th: string
          rate_percent: number
        }
        Update: {
          category_key?: string
          config_version_id?: string
          id?: string
          label_th?: string
          rate_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_rental_expense_rates_config_version_id_fkey"
            columns: ["config_version_id"]
            isOneToOne: false
            referencedRelation: "tax_config_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rental_expense_rates_config_version_id_fkey"
            columns: ["config_version_id"]
            isOneToOne: false
            referencedRelation: "v_tax_config_current"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_return_deductions: {
        Row: {
          amount_satang: number
          item_key: string
          tax_year: number
          user_id: string
        }
        Insert: {
          amount_satang?: number
          item_key: string
          tax_year: number
          user_id: string
        }
        Update: {
          amount_satang?: number
          item_key?: string
          tax_year?: number
          user_id?: string
        }
        Relationships: []
      }
      tax_returns: {
        Row: {
          child_first_count: number
          child_subsequent_count: number
          config_version_id: string | null
          created_at: string
          disabled_dependent_count: number
          expense_method_choices: Json
          has_spouse_no_income: boolean
          parent_count: number
          pnd94_paid_satang: number
          tax_year: number
          updated_at: string
          user_id: string
        }
        Insert: {
          child_first_count?: number
          child_subsequent_count?: number
          config_version_id?: string | null
          created_at?: string
          disabled_dependent_count?: number
          expense_method_choices?: Json
          has_spouse_no_income?: boolean
          parent_count?: number
          pnd94_paid_satang?: number
          tax_year: number
          updated_at?: string
          user_id: string
        }
        Update: {
          child_first_count?: number
          child_subsequent_count?: number
          config_version_id?: string | null
          created_at?: string
          disabled_dependent_count?: number
          expense_method_choices?: Json
          has_spouse_no_income?: boolean
          parent_count?: number
          pnd94_paid_satang?: number
          tax_year?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_returns_config_version_id_fkey"
            columns: ["config_version_id"]
            isOneToOne: false
            referencedRelation: "tax_config_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_returns_config_version_id_fkey"
            columns: ["config_version_id"]
            isOneToOne: false
            referencedRelation: "v_tax_config_current"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_withholding_entries: {
        Row: {
          amount_satang: number
          created_at: string
          id: string
          note: string | null
          source_label: string
          tax_year: number
          user_id: string
        }
        Insert: {
          amount_satang: number
          created_at?: string
          id?: string
          note?: string | null
          source_label: string
          tax_year: number
          user_id: string
        }
        Update: {
          amount_satang?: number
          created_at?: string
          id?: string
          note?: string | null
          source_label?: string
          tax_year?: number
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
      v_tax_config_current: {
        Row: {
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          id: string | null
          life_health_combined_cap_satang: number | null
          note: string | null
          retirement_combined_cap_satang: number | null
          section48_2_exempt_tax_satang: number | null
          section48_2_rate_percent: number | null
          section48_2_threshold_satang: number | null
          tax_year: number | null
          version_no: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_account_balances_as_of: {
        Args: { as_of: string }
        Returns: {
          account_id: string
          asset_liquidity: string
          balance: number
          is_invested: boolean
          is_mortgage: boolean
          name: string
          subtype: string
          term: string
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
      is_admin: { Args: never; Returns: boolean }
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
