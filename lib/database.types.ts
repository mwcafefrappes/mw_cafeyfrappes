export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_users": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"business_settings": {
                  Row: {
                    "business_address": string | null,"business_email": string | null,"business_lat": number | null,"business_lng": number | null,"business_name": string,"business_whatsapp": string | null,"delivery_fee_cents": number,"delivery_fee_mode": string,"delivery_min_subtotal_cents": number,"id": number,"logo_path": string | null,"maps_url": string | null,"order_delivery_enabled": boolean,"order_pickup_enabled": boolean,"order_table_enabled": boolean,"parent_store_instagram_url": string | null,"parent_store_name": string,"payment_methods": NonNullable<Json>,"scheduled_max_days_ahead": number,"scheduled_max_per_slot": number,"scheduled_min_lead_minutes": number,"scheduled_orders_enabled": boolean,"scheduled_slot_minutes": number,"seo_description": string | null,"seo_title": string | null,"site_url": string | null,"social_facebook_url": string | null,"social_instagram_url": string | null,"table_count": number,"tagline": string,"time_format": string,"transfer_bank": string | null,"transfer_clabe": string | null,"transfer_holder": string | null,"updated_at": string,"weekly_hours": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "business_address"?: string | null,"business_email"?: string | null,"business_lat"?: number | null,"business_lng"?: number | null,"business_name"?: string,"business_whatsapp"?: string | null,"delivery_fee_cents"?: number,"delivery_fee_mode"?: string,"delivery_min_subtotal_cents"?: number,"id"?: number,"logo_path"?: string | null,"maps_url"?: string | null,"order_delivery_enabled"?: boolean,"order_pickup_enabled"?: boolean,"order_table_enabled"?: boolean,"parent_store_instagram_url"?: string | null,"parent_store_name"?: string,"payment_methods"?: NonNullable<Json>,"scheduled_max_days_ahead"?: number,"scheduled_max_per_slot"?: number,"scheduled_min_lead_minutes"?: number,"scheduled_orders_enabled"?: boolean,"scheduled_slot_minutes"?: number,"seo_description"?: string | null,"seo_title"?: string | null,"site_url"?: string | null,"social_facebook_url"?: string | null,"social_instagram_url"?: string | null,"table_count"?: number,"tagline"?: string,"time_format"?: string,"transfer_bank"?: string | null,"transfer_clabe"?: string | null,"transfer_holder"?: string | null,"updated_at"?: string,"weekly_hours"?: NonNullable<Json>
                  }
                  Update: {
                    "business_address"?: string | null,"business_email"?: string | null,"business_lat"?: number | null,"business_lng"?: number | null,"business_name"?: string,"business_whatsapp"?: string | null,"delivery_fee_cents"?: number,"delivery_fee_mode"?: string,"delivery_min_subtotal_cents"?: number,"id"?: number,"logo_path"?: string | null,"maps_url"?: string | null,"order_delivery_enabled"?: boolean,"order_pickup_enabled"?: boolean,"order_table_enabled"?: boolean,"parent_store_instagram_url"?: string | null,"parent_store_name"?: string,"payment_methods"?: NonNullable<Json>,"scheduled_max_days_ahead"?: number,"scheduled_max_per_slot"?: number,"scheduled_min_lead_minutes"?: number,"scheduled_orders_enabled"?: boolean,"scheduled_slot_minutes"?: number,"seo_description"?: string | null,"seo_title"?: string | null,"site_url"?: string | null,"social_facebook_url"?: string | null,"social_instagram_url"?: string | null,"table_count"?: number,"tagline"?: string,"time_format"?: string,"transfer_bank"?: string | null,"transfer_clabe"?: string | null,"transfer_holder"?: string | null,"updated_at"?: string,"weekly_hours"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "active": boolean,"created_at": string,"description": string | null,"id": string,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"extra_groups": {
                  Row: {
                    "id": string,"max_select": number | null,"min_select": number,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"max_select"?: number | null,"min_select"?: number,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "id"?: string,"max_select"?: number | null,"min_select"?: number,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"extras": {
                  Row: {
                    "group_id": string,"id": string,"is_available": boolean,"name": string,"price_cents": number,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"id"?: string,"is_available"?: boolean,"name": string,"price_cents"?: number,"sort_order"?: number
                  }
                  Update: {
                    "group_id"?: string,"id"?: string,"is_available"?: boolean,"name"?: string,"price_cents"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "extras_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "extra_groups"
      referencedColumns: ["id"]
    }
                  ]
                },"landing_sections": {
                  Row: {
                    "heading": string | null,"image_path": string | null,"key": string,"subheading": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "heading"?: string | null,"image_path"?: string | null,"key": string,"subheading"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "heading"?: string | null,"image_path"?: string | null,"key"?: string,"subheading"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"metric_counts": {
                  Row: {
                    "count": number,"day": string,"key": string,"metric": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"day": string,"key"?: string,"metric": string
                  }
                  Update: {
                    "count"?: number,"day"?: string,"key"?: string,"metric"?: string
                  }
                  Relationships: [
                    
                  ]
                },"product_extra_groups": {
                  Row: {
                    "group_id": string,"product_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"product_id": string,"sort_order"?: number
                  }
                  Update: {
                    "group_id"?: string,"product_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_extra_groups_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "extra_groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_extra_groups_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_sizes": {
                  Row: {
                    "id": string,"name": string,"price_cents": number,"product_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"price_cents": number,"product_id": string,"sort_order"?: number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"price_cents"?: number,"product_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_sizes_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"base_price_cents": number,"category_id": string,"created_at": string,"description": string | null,"id": string,"is_available": boolean,"is_sample": boolean,"model_glb_path": string | null,"model_usdz_path": string | null,"name": string,"photo_path": string | null,"show_on_landing": boolean,"slug": string,"sort_order": number,"tags": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"base_price_cents"?: number,"category_id": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_available"?: boolean,"is_sample"?: boolean,"model_glb_path"?: string | null,"model_usdz_path"?: string | null,"name": string,"photo_path"?: string | null,"show_on_landing"?: boolean,"slug": string,"sort_order"?: number,"tags"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"base_price_cents"?: number,"category_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_available"?: boolean,"is_sample"?: boolean,"model_glb_path"?: string | null,"model_usdz_path"?: string | null,"name"?: string,"photo_path"?: string | null,"show_on_landing"?: boolean,"slug"?: string,"sort_order"?: number,"tags"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "increment_metric":
{ Args: { "p_key": string,"p_metric": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
