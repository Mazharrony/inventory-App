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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      sales: {
        Row: {
          created_at: string
          recorded_at: string
          id: string
          price: number
          product_name: string | null
          quantity: number
          total: number
          seller_name: string
          upc: string
          user_id: string
          product_id: string | null
          payment_method: string | null
          transaction_id: string | null
          status: string | null
          deactivation_reason: string | null
          deactivated_at: string | null
          customer_name: string | null
          customer_mobile: string | null
          customer_address: string | null
          customer_trn: string | null
          invoice_number: string | null
          invoice_type: string | null
          payment_reference: string | null
          order_comment: string | null
        }
        Insert: {
          created_at?: string
          recorded_at?: string
          id?: string
          price: number
          product_name?: string | null
          quantity?: number
          total: number
          seller_name: string
          upc: string
          user_id?: string
          product_id?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          status?: string | null
          deactivation_reason?: string | null
          deactivated_at?: string | null
          customer_name?: string | null
          customer_mobile?: string | null
          customer_address?: string | null
          customer_trn?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          payment_reference?: string | null
          order_comment?: string | null
        }
        Update: {
          created_at?: string
          recorded_at?: string
          id?: string
          price?: number
          product_name?: string | null
          quantity?: number
          total?: number
          seller_name?: string
          upc?: string
          user_id?: string
          product_id?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          status?: string | null
          deactivation_reason?: string | null
          deactivated_at?: string | null
          customer_name?: string | null
          customer_mobile?: string | null
          customer_address?: string | null
          customer_trn?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          payment_reference?: string | null
          order_comment?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: number
          name: string
          email: string | null
          phone: string | null
          address: string | null
          trn: string | null
          created_at: string | null
          updated_at: string | null
          mobile: string | null
          type: string | null
        }
        Insert: {
          id?: number
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          trn?: string | null
          created_at?: string | null
          updated_at?: string | null
          mobile?: string | null
          type?: string | null
        }
        Update: {
          id?: number
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          trn?: string | null
          created_at?: string | null
          updated_at?: string | null
          mobile?: string | null
          type?: string | null
        }
        Relationships: []
      }
            products: {
              Row: {
                id: string
                name: string
                upc: string
                price: number
                stock: number
                created_at: string
                updated_at: string
                is_active: boolean | null
              }
              Insert: {
                id?: string
                name: string
                upc: string
                price: number
                stock?: number
                created_at?: string
                updated_at?: string
                is_active?: boolean | null
              }
              Update: {
                id?: string
                name?: string
                upc?: string
                price?: number
                stock?: number
                created_at?: string
                updated_at?: string
                is_active?: boolean | null
              }
              Relationships: []
            }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sellers: {
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
      sales_undo_log: {
        Row: {
          id: number
          sale_id: number | null
          sale_data: any | null
          undone_by: string | null
          undone_at: string | null
          reason: string | null
        }
        Insert: {
          id?: number
          sale_id?: number | null
          sale_data?: any | null
          undone_by?: string | null
          undone_at?: string | null
          reason?: string | null
        }
        Update: {
          id?: number
          sale_id?: number | null
          sale_data?: any | null
          undone_by?: string | null
          undone_at?: string | null
          reason?: string | null
        }
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          user_id: string | null
          email: string
          role: string
          is_active: boolean
          created_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          user_id?: string | null
          email: string
          role?: string
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string | null
          email?: string
          role?: string
          is_active?: boolean
          created_by?: string | null
        }
        Relationships: []
      }
      undo_logs: {
        Row: {
          id: string
          original_sale_id: string
          sale_upc: string
          sale_product_name: string | null
          sale_quantity: number
          sale_price: number
          sale_total: number
          seller_name: string
          original_sale_date: string
          undo_reason: string
          undone_by: string
          undone_at: string
          inventory_restored: boolean
          created_at: string
        }
        Insert: {
          id?: string
          original_sale_id: string
          sale_upc: string
          sale_product_name?: string | null
          sale_quantity: number
          sale_price: number
          sale_total: number
          seller_name: string
          original_sale_date: string
          undo_reason: string
          undone_by: string
          undone_at?: string
          inventory_restored?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          original_sale_id?: string
          sale_upc?: string
          sale_product_name?: string | null
          sale_quantity?: number
          sale_price?: number
          sale_total?: number
          seller_name?: string
          original_sale_date?: string
          undo_reason?: string
          undone_by?: string
          undone_at?: string
          inventory_restored?: boolean
          created_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          id: number
          product_id: string
          product_name: string
          previous_stock: number
          new_stock: number
          quantity_added: number
          movement_type: string
          created_by: string
          created_at: string
          notes: string | null
        }
        Insert: {
          id?: number
          product_id: string
          product_name: string
          previous_stock: number
          new_stock: number
          quantity_added: number
          movement_type?: string
          created_by: string
          created_at?: string
          notes?: string | null
        }
        Update: {
          id?: number
          product_id?: string
          product_name?: string
          previous_stock?: number
          new_stock?: number
          quantity_added?: number
          movement_type?: string
          created_by?: string
          created_at?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
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
      app_role: "admin" | "seller" | "accounts"
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
      app_role: ["admin", "seller", "accounts"],
    },
  },
} as const

// Helper types for better development experience
export type UserRole = 'admin' | 'seller' | 'accounts';

export interface UserRoleData {
  id: string;
  user_id: string | null;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}
