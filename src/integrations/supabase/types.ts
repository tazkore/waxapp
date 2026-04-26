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
      accounts_payable: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          payment_date: string | null
          purchase_order_id: string | null
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          purchase_order_id?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          purchase_order_id?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      amazon_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_status: string | null
          marketplace_id: string | null
          notes: string | null
          refresh_token: string | null
          region: string | null
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_status?: string | null
          marketplace_id?: string | null
          notes?: string | null
          refresh_token?: string | null
          region?: string | null
          seller_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_status?: string | null
          marketplace_id?: string | null
          notes?: string | null
          refresh_token?: string | null
          region?: string | null
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      amazon_orders: {
        Row: {
          amazon_order_id: string
          buyer_email: string | null
          fulfillment_channel: string | null
          id: string
          items: Json | null
          order_status: string | null
          purchase_date: string | null
          raw: Json | null
          synced_at: string
          total: number | null
        }
        Insert: {
          amazon_order_id: string
          buyer_email?: string | null
          fulfillment_channel?: string | null
          id?: string
          items?: Json | null
          order_status?: string | null
          purchase_date?: string | null
          raw?: Json | null
          synced_at?: string
          total?: number | null
        }
        Update: {
          amazon_order_id?: string
          buyer_email?: string | null
          fulfillment_channel?: string | null
          id?: string
          items?: Json | null
          order_status?: string | null
          purchase_date?: string | null
          raw?: Json | null
          synced_at?: string
          total?: number | null
        }
        Relationships: []
      }
      amazon_products: {
        Row: {
          asin: string
          fulfillment_channel: string | null
          id: string
          image_url: string | null
          price: number | null
          quantity: number | null
          raw: Json | null
          sku: string | null
          status: string | null
          synced_at: string
          title: string
        }
        Insert: {
          asin: string
          fulfillment_channel?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          quantity?: number | null
          raw?: Json | null
          sku?: string | null
          status?: string | null
          synced_at?: string
          title: string
        }
        Update: {
          asin?: string
          fulfillment_channel?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          quantity?: number | null
          raw?: Json | null
          sku?: string | null
          status?: string | null
          synced_at?: string
          title?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_holder: string
          account_number: string | null
          bank_name: string
          clabe: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          notes: string | null
          swift: string | null
          updated_at: string
        }
        Insert: {
          account_holder: string
          account_number?: string | null
          bank_name: string
          clabe?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          swift?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_number?: string | null
          bank_name?: string
          clabe?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          swift?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_text: string | null
          cta_url: string | null
          display_order: number
          id: string
          image_path: string
          is_active: boolean
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          display_order?: number
          id?: string
          image_path: string
          is_active?: boolean
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          display_order?: number
          id?: string
          image_path?: string
          is_active?: boolean
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          keywords: string[]
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          author?: string
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          keywords?: string[]
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          author?: string
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          keywords?: string[]
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_featured: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      carts: {
        Row: {
          created_at: string
          id: string
          items: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatbot_kb: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_notifications: {
        Row: {
          body: string | null
          created_at: string
          email: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string
          id: string
          last_order_date: string | null
          loyalty_points: number
          membership_tier: string
          name: string
          phone: string | null
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_order_date?: string | null
          loyalty_points?: number
          membership_tier?: string
          name: string
          phone?: string | null
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_order_date?: string | null
          loyalty_points?: number
          membership_tier?: string
          name?: string
          phone?: string | null
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      clip_sync_runs: {
        Row: {
          attempts: number
          discrepancies_count: number
          error_message: string | null
          finished_at: string | null
          id: string
          inserted: number
          last_cursor: string | null
          last_offset: number | null
          mode: string
          parent_run_id: string | null
          since: string | null
          started_at: string
          status: string
          total_remote: number
          triggered_by: string | null
          until: string | null
          updated: number
          upserts: number
        }
        Insert: {
          attempts?: number
          discrepancies_count?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          inserted?: number
          last_cursor?: string | null
          last_offset?: number | null
          mode?: string
          parent_run_id?: string | null
          since?: string | null
          started_at?: string
          status?: string
          total_remote?: number
          triggered_by?: string | null
          until?: string | null
          updated?: number
          upserts?: number
        }
        Update: {
          attempts?: number
          discrepancies_count?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          inserted?: number
          last_cursor?: string | null
          last_offset?: number | null
          mode?: string
          parent_run_id?: string | null
          since?: string | null
          started_at?: string
          status?: string
          total_remote?: number
          triggered_by?: string | null
          until?: string | null
          updated?: number
          upserts?: number
        }
        Relationships: []
      }
      custom_pages: {
        Row: {
          blocks: Json
          created_at: string
          display_order: number
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          show_in_navbar: boolean
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          display_order?: number
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          show_in_navbar?: boolean
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          display_order?: number
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          show_in_navbar?: boolean
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          address: string | null
          city: string | null
          country: string
          created_at: string
          full_name: string
          id: string
          phone: string
          postal_code: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country: string
          created_at?: string
          full_name: string
          id?: string
          phone: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discounts: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_purchase: number | null
          type: string
          updated_at: string
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number | null
          type?: string
          updated_at?: string
          used_count?: number
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number | null
          type?: string
          updated_at?: string
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      integrations: {
        Row: {
          api_docs_url: string | null
          category: string
          config: Json
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          is_installed: boolean
          name: string
          slug: string
          updated_at: string
          version: string | null
        }
        Insert: {
          api_docs_url?: string | null
          category?: string
          config?: Json
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_installed?: boolean
          name: string
          slug: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          api_docs_url?: string | null
          category?: string
          config?: Json
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_installed?: boolean
          name?: string
          slug?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      nav_menu_items: {
        Row: {
          created_at: string
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          label: string
          menu_id: string
          open_in_new_tab: boolean
          parent_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          menu_id: string
          open_in_new_tab?: boolean
          parent_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          menu_id?: string
          open_in_new_tab?: boolean
          parent_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "nav_menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "nav_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nav_menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nav_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      nav_menus: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          notes: string | null
          order_id: string
          previous_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          order_id: string
          previous_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          order_id?: string
          previous_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          items: Json
          order_number: string
          shipping_address: string | null
          status: string
          total: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          id?: string
          items?: Json
          order_number: string
          shipping_address?: string | null
          status?: string
          total?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          items?: Json
          order_number?: string
          shipping_address?: string | null
          status?: string
          total?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          display_order: number
          fees: Json
          icon_url: string | null
          id: string
          instructions: string | null
          is_active: boolean
          name: string
          requires_verification: boolean
          slug: string
          supports_refunds: boolean
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          display_order?: number
          fees?: Json
          icon_url?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          name: string
          requires_verification?: boolean
          slug: string
          supports_refunds?: boolean
          type?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          display_order?: number
          fees?: Json
          icon_url?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          name?: string
          requires_verification?: boolean
          slug?: string
          supports_refunds?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string
          id: string
          notes: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          transaction_id: string
          uploaded_by_email: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_id: string
          uploaded_by_email?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          notes?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_id?: string
          uploaded_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          external_id: string | null
          fee_amount: number
          gateway_id: string | null
          gateway_slug: string
          id: string
          method: string | null
          net_amount: number
          notes: string | null
          order_id: string | null
          paid_at: string | null
          raw: Json
          reference: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          external_id?: string | null
          fee_amount?: number
          gateway_id?: string | null
          gateway_slug: string
          id?: string
          method?: string | null
          net_amount?: number
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          raw?: Json
          reference?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          external_id?: string | null
          fee_amount?: number
          gateway_id?: string | null
          gateway_slug?: string
          id?: string
          method?: string | null
          net_amount?: number
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          raw?: Json
          reference?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          product_id: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          product_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          product_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category: string | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          featured_order: number
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          sku: string | null
          slug: string | null
          stock: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          brand_id?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          featured_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number
          sku?: string | null
          slug?: string | null
          stock?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          brand_id?: string | null
          category?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          featured_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          sku?: string | null
          slug?: string | null
          stock?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          expected_delivery: string | null
          id: string
          items: Json
          notes: string | null
          order_number: string
          status: string
          supplier_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_delivery?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number: string
          status?: string
          supplier_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_delivery?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string
          status?: string
          supplier_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_pages: {
        Row: {
          auto_sitemap: boolean
          canonical_url: string | null
          created_at: string
          id: string
          is_indexed: boolean
          keywords: string[]
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          page_path: string
          page_title: string
          updated_at: string
        }
        Insert: {
          auto_sitemap?: boolean
          canonical_url?: string | null
          created_at?: string
          id?: string
          is_indexed?: boolean
          keywords?: string[]
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          page_path: string
          page_title: string
          updated_at?: string
        }
        Update: {
          auto_sitemap?: boolean
          canonical_url?: string | null
          created_at?: string
          id?: string
          is_indexed?: boolean
          keywords?: string[]
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          page_path?: string
          page_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_redirects: {
        Row: {
          created_at: string
          from_path: string
          hit_count: number
          id: string
          is_active: boolean
          is_wildcard: boolean
          last_hit_at: string | null
          priority: number
          reason: string | null
          status_code: number
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_path: string
          hit_count?: number
          id?: string
          is_active?: boolean
          is_wildcard?: boolean
          last_hit_at?: string | null
          priority?: number
          reason?: string | null
          status_code?: number
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_path?: string
          hit_count?: number
          id?: string
          is_active?: boolean
          is_wildcard?: boolean
          last_hit_at?: string | null
          priority?: number
          reason?: string | null
          status_code?: number
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          carrier: string
          cost: number
          created_at: string
          destination_postal: string | null
          id: string
          label_url: string | null
          order_id: string
          origin_postal: string | null
          raw: Json | null
          service_level: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          carrier: string
          cost?: number
          created_at?: string
          destination_postal?: string | null
          id?: string
          label_url?: string | null
          order_id: string
          origin_postal?: string | null
          raw?: Json | null
          service_level?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          carrier?: string
          cost?: number
          created_at?: string
          destination_postal?: string | null
          id?: string
          label_url?: string | null
          order_id?: string
          origin_postal?: string | null
          raw?: Json | null
          service_level?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      shipping_providers: {
        Row: {
          api_key_ref: string | null
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          api_key_ref?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          api_key_ref?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_tasks: {
        Row: {
          assigned_avatar: string | null
          assigned_to: string | null
          checklist: Json
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_avatar?: string | null
          assigned_to?: string | null
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_avatar?: string | null
          assigned_to?: string | null
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          category: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      theme_settings: {
        Row: {
          color_accent: string
          color_background: string
          color_foreground: string
          color_primary: string
          color_secondary: string
          created_at: string
          custom_css: string | null
          favicon_url: string | null
          font_body: string
          font_heading: string
          id: string
          is_active: boolean
          logo_dark_url: string | null
          logo_url: string | null
          og_image_url: string | null
          site_name: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          color_accent?: string
          color_background?: string
          color_foreground?: string
          color_primary?: string
          color_secondary?: string
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          font_body?: string
          font_heading?: string
          id?: string
          is_active?: boolean
          logo_dark_url?: string | null
          logo_url?: string | null
          og_image_url?: string | null
          site_name?: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          color_accent?: string
          color_background?: string
          color_foreground?: string
          color_primary?: string
          color_secondary?: string
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          font_body?: string
          font_heading?: string
          id?: string
          is_active?: boolean
          logo_dark_url?: string | null
          logo_url?: string | null
          og_image_url?: string | null
          site_name?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
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
      warehouses: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wholesale_leads: {
        Row: {
          assigned_to: string | null
          company_name: string
          contact_name: string
          created_at: string
          credit_limit: number | null
          credit_status: string | null
          credit_terms: string | null
          email: string | null
          estimated_value: number
          id: string
          notes: string | null
          phone: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          credit_limit?: number | null
          credit_status?: string | null
          credit_terms?: string | null
          email?: string | null
          estimated_value?: number
          id?: string
          notes?: string | null
          phone?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          credit_limit?: number | null
          credit_status?: string | null
          credit_terms?: string | null
          email?: string | null
          estimated_value?: number
          id?: string
          notes?: string | null
          phone?: string | null
          stage?: string
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
      app_role: "admin" | "moderator" | "super_admin"
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
      app_role: ["admin", "moderator", "super_admin"],
    },
  },
} as const
