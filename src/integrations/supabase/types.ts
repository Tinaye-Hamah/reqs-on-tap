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
      assets_register: {
        Row: {
          accumulated_depreciation: number
          acquisition_date: string
          asset_code: string
          category: string
          cost: number
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          requisition_id: string | null
          residual_value: number
          status: string
          updated_at: string
          useful_life_months: number
        }
        Insert: {
          accumulated_depreciation?: number
          acquisition_date?: string
          asset_code: string
          category?: string
          cost?: number
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          requisition_id?: string | null
          residual_value?: number
          status?: string
          updated_at?: string
          useful_life_months?: number
        }
        Update: {
          accumulated_depreciation?: number
          acquisition_date?: string
          asset_code?: string
          category?: string
          cost?: number
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          requisition_id?: string | null
          residual_value?: number
          status?: string
          updated_at?: string
          useful_life_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "assets_register_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
      audit_trail: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          performed_by: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          performed_by: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          performed_by?: string
        }
        Relationships: []
      }
      cashbook: {
        Row: {
          balance: number
          created_at: string
          credit: number
          debit: number
          description: string
          id: string
          requisition_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          credit?: number
          debit?: number
          description?: string
          id?: string
          requisition_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          credit?: number
          debit?: number
          description?: string
          id?: string
          requisition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashbook_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_subtype: Database["public"]["Enums"]["account_subtype"]
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_subtype?: Database["public"]["Enums"]["account_subtype"]
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_subtype?: Database["public"]["Enums"]["account_subtype"]
          account_type?: Database["public"]["Enums"]["account_type"]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      department_budgets: {
        Row: {
          budget_limit: number
          created_at: string
          department: string
          id: string
          month: string
          updated_at: string
        }
        Insert: {
          budget_limit?: number
          created_at?: string
          department: string
          id?: string
          month: string
          updated_at?: string
        }
        Update: {
          budget_limit?: number
          created_at?: string
          department?: string
          id?: string
          month?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          is_locked: boolean
          is_posted: boolean
          journal_date: string
          journal_number: string
          journal_type: Database["public"]["Enums"]["journal_type"]
          notes: string | null
          payment_account_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_reference: string | null
          reference_id: string | null
          reference_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          is_locked?: boolean
          is_posted?: boolean
          journal_date?: string
          journal_number: string
          journal_type: Database["public"]["Enums"]["journal_type"]
          notes?: string | null
          payment_account_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_locked?: boolean
          is_posted?: boolean
          journal_date?: string
          journal_number?: string
          journal_type?: Database["public"]["Enums"]["journal_type"]
          notes?: string | null
          payment_account_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journals_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities_register: {
        Row: {
          created_at: string
          creditor: string | null
          id: string
          interest_rate: number
          liability_type: string
          maturity_date: string | null
          name: string
          notes: string | null
          original_amount: number
          outstanding_amount: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creditor?: string | null
          id?: string
          interest_rate?: number
          liability_type?: string
          maturity_date?: string | null
          name: string
          notes?: string | null
          original_amount?: number
          outstanding_amount?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creditor?: string | null
          id?: string
          interest_rate?: number
          liability_type?: string
          maturity_date?: string | null
          name?: string
          notes?: string | null
          original_amount?: number
          outstanding_amount?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payables: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          description: string
          due_date: string | null
          id: string
          journal_id: string | null
          requisition_id: string | null
          status: string
          supplier: string
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_paid?: number
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          journal_id?: string | null
          requisition_id?: string | null
          status?: string
          supplier?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          journal_id?: string | null
          requisition_id?: string | null
          status?: string
          supplier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          description: string
          id: string
          quantity: number
          quotation_id: string
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          quantity?: number
          quotation_id: string
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          quantity?: number
          quotation_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          created_by: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          quotation_date: string
          quotation_number: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          quotation_date?: string
          quotation_number: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          quotation_date?: string
          quotation_number?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      receivables: {
        Row: {
          amount: number
          amount_received: number
          created_at: string
          customer: string
          description: string
          due_date: string | null
          id: string
          journal_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_received?: number
          created_at?: string
          customer?: string
          description?: string
          due_date?: string | null
          id?: string
          journal_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_received?: number
          created_at?: string
          customer?: string
          description?: string
          due_date?: string | null
          id?: string
          journal_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_items: {
        Row: {
          description: string
          id: string
          quantity: number
          requisition_id: string
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          quantity?: number
          requisition_id: string
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          quantity?: number
          requisition_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "requisition_items_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          department: string
          expense_account_id: string | null
          id: string
          journal_id: string | null
          justification: string
          payment_account_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          priority: string
          rejection_reason: string | null
          req_number: string
          status: string
          title: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          department: string
          expense_account_id?: string | null
          id?: string
          journal_id?: string | null
          justification?: string
          payment_account_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          priority: string
          rejection_reason?: string | null
          req_number: string
          status?: string
          title: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          department?: string
          expense_account_id?: string | null
          id?: string
          journal_id?: string | null
          justification?: string
          payment_account_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          priority?: string
          rejection_reason?: string | null
          req_number?: string
          status?: string
          title?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisitions_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_elevated_role: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_subtype:
        | "Cash"
        | "Bank"
        | "Receivable"
        | "Payable"
        | "Fixed Asset"
        | "Accumulated Depreciation"
        | "Current Liability"
        | "Long Term Liability"
        | "Equity"
        | "Revenue"
        | "Cost of Sales"
        | "Expense"
        | "Other"
      account_type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"
      app_role: "employee" | "manager" | "accountant" | "ceo"
      journal_type:
        | "opening_balance"
        | "requisition_approval"
        | "manual"
        | "payment"
        | "receipt"
        | "revenue"
        | "expense"
        | "depreciation"
        | "reversal"
      payment_method: "cash" | "bank"
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
      account_subtype: [
        "Cash",
        "Bank",
        "Receivable",
        "Payable",
        "Fixed Asset",
        "Accumulated Depreciation",
        "Current Liability",
        "Long Term Liability",
        "Equity",
        "Revenue",
        "Cost of Sales",
        "Expense",
        "Other",
      ],
      account_type: ["Asset", "Liability", "Equity", "Revenue", "Expense"],
      app_role: ["employee", "manager", "accountant", "ceo"],
      journal_type: [
        "opening_balance",
        "requisition_approval",
        "manual",
        "payment",
        "receipt",
        "revenue",
        "expense",
        "depreciation",
        "reversal",
      ],
      payment_method: ["cash", "bank"],
    },
  },
} as const
