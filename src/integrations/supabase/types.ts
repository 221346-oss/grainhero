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
      actuators: {
        Row: {
          actuator_id: string
          actuator_type: Database["public"]["Enums"]["actuator_type"]
          admin_id: string
          ai_control: Json | null
          control_mode: string | null
          created_at: string | null
          created_by: string
          current_operation: Json | null
          deleted_at: string | null
          health_metrics: Json | null
          human_requested_fan: boolean | null
          id: string
          is_enabled: boolean | null
          is_on: boolean | null
          mac_address: string | null
          manufacturer: string | null
          ml_decision: string | null
          ml_requested_fan: boolean | null
          model: string | null
          name: string
          notes: string | null
          performance_metrics: Json | null
          power_level: number | null
          safety_limits: Json | null
          schedule: Json | null
          silo_id: string
          status: string | null
          tags: string[] | null
          target_fan_speed: number | null
          thresholds: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          actuator_id: string
          actuator_type: Database["public"]["Enums"]["actuator_type"]
          admin_id: string
          ai_control?: Json | null
          control_mode?: string | null
          created_at?: string | null
          created_by: string
          current_operation?: Json | null
          deleted_at?: string | null
          health_metrics?: Json | null
          human_requested_fan?: boolean | null
          id?: string
          is_enabled?: boolean | null
          is_on?: boolean | null
          mac_address?: string | null
          manufacturer?: string | null
          ml_decision?: string | null
          ml_requested_fan?: boolean | null
          model?: string | null
          name: string
          notes?: string | null
          performance_metrics?: Json | null
          power_level?: number | null
          safety_limits?: Json | null
          schedule?: Json | null
          silo_id: string
          status?: string | null
          tags?: string[] | null
          target_fan_speed?: number | null
          thresholds?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          actuator_id?: string
          actuator_type?: Database["public"]["Enums"]["actuator_type"]
          admin_id?: string
          ai_control?: Json | null
          control_mode?: string | null
          created_at?: string | null
          created_by?: string
          current_operation?: Json | null
          deleted_at?: string | null
          health_metrics?: Json | null
          human_requested_fan?: boolean | null
          id?: string
          is_enabled?: boolean | null
          is_on?: boolean | null
          mac_address?: string | null
          manufacturer?: string | null
          ml_decision?: string | null
          ml_requested_fan?: boolean | null
          model?: string | null
          name?: string
          notes?: string | null
          performance_metrics?: Json | null
          power_level?: number | null
          safety_limits?: Json | null
          schedule?: Json | null
          silo_id?: string
          status?: string | null
          tags?: string[] | null
          target_fan_speed?: number | null
          thresholds?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actuators_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actuators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actuators_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "silos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actuators_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_invoices: {
        Row: {
          admin_id: string
          amount_paid: number | null
          batch_id: string
          batch_ref: string | null
          buyer_company: string | null
          buyer_contact: Json | null
          buyer_id: string
          buyer_name: string | null
          created_at: string | null
          created_by: string
          currency: string | null
          due_date: string | null
          emailed: boolean | null
          emailed_at: string | null
          id: string
          invoice_number: string
          items: Json | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          pdf_url: string | null
          subtotal: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          amount_paid?: number | null
          batch_id: string
          batch_ref?: string | null
          buyer_company?: string | null
          buyer_contact?: Json | null
          buyer_id: string
          buyer_name?: string | null
          created_at?: string | null
          created_by: string
          currency?: string | null
          due_date?: string | null
          emailed?: boolean | null
          emailed_at?: string | null
          id?: string
          invoice_number: string
          items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          amount_paid?: number | null
          batch_id?: string
          batch_ref?: string | null
          buyer_company?: string | null
          buyer_contact?: Json | null
          buyer_id?: string
          buyer_name?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string | null
          due_date?: string | null
          emailed?: boolean | null
          emailed_at?: string | null
          id?: string
          invoice_number?: string
          items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_invoices_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_invoices_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "grain_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_invoices_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_payments: {
        Row: {
          admin_id: string
          amount: number
          batch_id: string | null
          buyer_id: string
          created_at: string | null
          currency: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string
          payment_reference: string | null
          recorded_by: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          amount: number
          batch_id?: string | null
          buyer_id: string
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method: string
          payment_reference?: string | null
          recorded_by: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          amount?: number
          batch_id?: string | null
          buyer_id?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string
          payment_reference?: string | null
          recorded_by?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_payments_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_payments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "grain_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_payments_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "buyer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          address: string | null
          admin_id: string
          buyer_type: Database["public"]["Enums"]["buyer_type"] | null
          city: string | null
          company_name: string | null
          contact_designation: string | null
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          country: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          last_interaction_at: string | null
          last_order_at: string | null
          name: string
          notes: string | null
          preferred_grain_types:
            | Database["public"]["Enums"]["grain_type"][]
            | null
          preferred_payment_terms: string | null
          rating: number | null
          state: string | null
          status: Database["public"]["Enums"]["buyer_status"] | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admin_id: string
          buyer_type?: Database["public"]["Enums"]["buyer_type"] | null
          city?: string | null
          company_name?: string | null
          contact_designation?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          last_interaction_at?: string | null
          last_order_at?: string | null
          name: string
          notes?: string | null
          preferred_grain_types?:
            | Database["public"]["Enums"]["grain_type"][]
            | null
          preferred_payment_terms?: string | null
          rating?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["buyer_status"] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admin_id?: string
          buyer_type?: Database["public"]["Enums"]["buyer_type"] | null
          city?: string | null
          company_name?: string | null
          contact_designation?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          last_interaction_at?: string | null
          last_order_at?: string | null
          name?: string
          notes?: string | null
          preferred_grain_types?:
            | Database["public"]["Enums"]["grain_type"][]
            | null
          preferred_payment_terms?: string | null
          rating?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["buyer_status"] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyers_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grain_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actions_taken: Json | null
          actuator_id: string | null
          admin_id: string
          ai_context: Json | null
          alert_id: string
          alert_type: string | null
          assigned_to: string | null
          auto_resolve: boolean | null
          auto_resolve_after: number | null
          batch_id: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          deleted_at: string | null
          device_id: string | null
          environmental_context: Json | null
          escalation_history: Json | null
          escalation_level: number | null
          id: string
          message: string
          notifications_sent: Json | null
          priority: Database["public"]["Enums"]["alert_priority"]
          related_alerts: Json | null
          resolution: Json | null
          resolved_at: string | null
          resolved_by: string | null
          sensor_type: Database["public"]["Enums"]["sensor_type"] | null
          silo_id: string | null
          source: string
          status: Database["public"]["Enums"]["alert_status"] | null
          suppress_similar: boolean | null
          suppression_period: number | null
          tags: string[] | null
          title: string
          trigger_conditions: Json | null
          triggered_at: string | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actions_taken?: Json | null
          actuator_id?: string | null
          admin_id: string
          ai_context?: Json | null
          alert_id: string
          alert_type?: string | null
          assigned_to?: string | null
          auto_resolve?: boolean | null
          auto_resolve_after?: number | null
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          device_id?: string | null
          environmental_context?: Json | null
          escalation_history?: Json | null
          escalation_level?: number | null
          id?: string
          message: string
          notifications_sent?: Json | null
          priority: Database["public"]["Enums"]["alert_priority"]
          related_alerts?: Json | null
          resolution?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          sensor_type?: Database["public"]["Enums"]["sensor_type"] | null
          silo_id?: string | null
          source: string
          status?: Database["public"]["Enums"]["alert_status"] | null
          suppress_similar?: boolean | null
          suppression_period?: number | null
          tags?: string[] | null
          title: string
          trigger_conditions?: Json | null
          triggered_at?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actions_taken?: Json | null
          actuator_id?: string | null
          admin_id?: string
          ai_context?: Json | null
          alert_id?: string
          alert_type?: string | null
          assigned_to?: string | null
          auto_resolve?: boolean | null
          auto_resolve_after?: number | null
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          device_id?: string | null
          environmental_context?: Json | null
          escalation_history?: Json | null
          escalation_level?: number | null
          id?: string
          message?: string
          notifications_sent?: Json | null
          priority?: Database["public"]["Enums"]["alert_priority"]
          related_alerts?: Json | null
          resolution?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          sensor_type?: Database["public"]["Enums"]["sensor_type"] | null
          silo_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["alert_status"] | null
          suppress_similar?: boolean | null
          suppression_period?: number | null
          tags?: string[] | null
          title?: string
          trigger_conditions?: Json | null
          triggered_at?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grain_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_alerts_actuator_id_fkey"
            columns: ["actuator_id"]
            isOneToOne: false
            referencedRelation: "actuators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_alerts_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_alerts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_alerts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "grain_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_alerts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sensor_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_alerts_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "silos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_alerts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      grain_batches: {
        Row: {
          actual_dispatch_date: string | null
          admin_id: string
          ai_prediction_confidence: number | null
          batch_id: string
          buyer_id: string | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          dispatch_details: Json | null
          dispatched_quantity_kg: number | null
          expected_dispatch_date: string | null
          farmer_contact: string | null
          farmer_name: string | null
          grade: string | null
          grain_type: Database["public"]["Enums"]["grain_type"]
          harvest_date: string | null
          id: string
          insurance_policy_number: string | null
          insurance_value: number | null
          insured: boolean | null
          intake_conditions: Json | null
          intake_date: string | null
          last_risk_assessment: string | null
          moisture_content: number | null
          notes: string | null
          origin_coordinates: Json | null
          profit: number | null
          protein_content: number | null
          purchase_price_per_kg: number | null
          qr_code: string | null
          quality_tests: Json | null
          quantity_kg: number
          revenue: number | null
          risk_score: number | null
          sell_price_per_kg: number | null
          sensor_summary: Json | null
          silo_id: string
          source_location: string | null
          spoilage_events: Json | null
          spoilage_label: Database["public"]["Enums"]["spoilage_label"] | null
          status: Database["public"]["Enums"]["batch_status"] | null
          tags: string[] | null
          test_weight: number | null
          total_purchase_value: number | null
          updated_at: string | null
          updated_by: string | null
          variety: string | null
          warehouse_id: string
        }
        Insert: {
          actual_dispatch_date?: string | null
          admin_id: string
          ai_prediction_confidence?: number | null
          batch_id: string
          buyer_id?: string | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          dispatch_details?: Json | null
          dispatched_quantity_kg?: number | null
          expected_dispatch_date?: string | null
          farmer_contact?: string | null
          farmer_name?: string | null
          grade?: string | null
          grain_type: Database["public"]["Enums"]["grain_type"]
          harvest_date?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_value?: number | null
          insured?: boolean | null
          intake_conditions?: Json | null
          intake_date?: string | null
          last_risk_assessment?: string | null
          moisture_content?: number | null
          notes?: string | null
          origin_coordinates?: Json | null
          profit?: number | null
          protein_content?: number | null
          purchase_price_per_kg?: number | null
          qr_code?: string | null
          quality_tests?: Json | null
          quantity_kg: number
          revenue?: number | null
          risk_score?: number | null
          sell_price_per_kg?: number | null
          sensor_summary?: Json | null
          silo_id: string
          source_location?: string | null
          spoilage_events?: Json | null
          spoilage_label?: Database["public"]["Enums"]["spoilage_label"] | null
          status?: Database["public"]["Enums"]["batch_status"] | null
          tags?: string[] | null
          test_weight?: number | null
          total_purchase_value?: number | null
          updated_at?: string | null
          updated_by?: string | null
          variety?: string | null
          warehouse_id: string
        }
        Update: {
          actual_dispatch_date?: string | null
          admin_id?: string
          ai_prediction_confidence?: number | null
          batch_id?: string
          buyer_id?: string | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          dispatch_details?: Json | null
          dispatched_quantity_kg?: number | null
          expected_dispatch_date?: string | null
          farmer_contact?: string | null
          farmer_name?: string | null
          grade?: string | null
          grain_type?: Database["public"]["Enums"]["grain_type"]
          harvest_date?: string | null
          id?: string
          insurance_policy_number?: string | null
          insurance_value?: number | null
          insured?: boolean | null
          intake_conditions?: Json | null
          intake_date?: string | null
          last_risk_assessment?: string | null
          moisture_content?: number | null
          notes?: string | null
          origin_coordinates?: Json | null
          profit?: number | null
          protein_content?: number | null
          purchase_price_per_kg?: number | null
          qr_code?: string | null
          quality_tests?: Json | null
          quantity_kg?: number
          revenue?: number | null
          risk_score?: number | null
          sell_price_per_kg?: number | null
          sensor_summary?: Json | null
          silo_id?: string
          source_location?: string | null
          spoilage_events?: Json | null
          spoilage_label?: Database["public"]["Enums"]["spoilage_label"] | null
          status?: Database["public"]["Enums"]["batch_status"] | null
          tags?: string[] | null
          test_weight?: number | null
          total_purchase_value?: number | null
          updated_at?: string | null
          updated_by?: string | null
          variety?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_grain_batches_buyer"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_batches_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_batches_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "silos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_batches_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grain_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          admin_id: string
          amount: number
          billing_date: string | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          stripe_invoice_id: string | null
          subscription_id: string
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          amount?: number
          billing_date?: string | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_invoice_id?: string | null
          subscription_id: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          amount?: number
          billing_date?: string | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_invoice_id?: string | null
          subscription_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: Json | null
          admin_id: string | null
          avatar: string | null
          blocked: boolean | null
          business_type: string | null
          certification_level: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          department: string | null
          email: string | null
          email_verified: boolean | null
          employee_id: string | null
          fcm_tokens: Json | null
          first_login: boolean | null
          has_access: string | null
          id: string
          invitation_expires: string | null
          invitation_role: string | null
          invitation_token: string | null
          invited_by: string | null
          last_login: string | null
          location: Json | null
          name: string
          phone: string | null
          preferences: Json | null
          price_id: string | null
          shift_pattern: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          subscription_plan: string | null
          updated_at: string | null
          updated_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          address?: Json | null
          admin_id?: string | null
          avatar?: string | null
          blocked?: boolean | null
          business_type?: string | null
          certification_level?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          email_verified?: boolean | null
          employee_id?: string | null
          fcm_tokens?: Json | null
          first_login?: boolean | null
          has_access?: string | null
          id: string
          invitation_expires?: string | null
          invitation_role?: string | null
          invitation_token?: string | null
          invited_by?: string | null
          last_login?: string | null
          location?: Json | null
          name?: string
          phone?: string | null
          preferences?: Json | null
          price_id?: string | null
          shift_pattern?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          subscription_plan?: string | null
          updated_at?: string | null
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          address?: Json | null
          admin_id?: string | null
          avatar?: string | null
          blocked?: boolean | null
          business_type?: string | null
          certification_level?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          email_verified?: boolean | null
          employee_id?: string | null
          fcm_tokens?: Json | null
          first_login?: boolean | null
          has_access?: string | null
          id?: string
          invitation_expires?: string | null
          invitation_role?: string | null
          invitation_token?: string | null
          invited_by?: string | null
          last_login?: string | null
          location?: Json | null
          name?: string
          phone?: string | null
          preferences?: Json | null
          price_id?: string | null
          shift_pattern?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          subscription_plan?: string | null
          updated_at?: string | null
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_warehouse"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_devices: {
        Row: {
          admin_id: string
          battery_level: number | null
          calibration_due_date: string | null
          calibration_interval_days: number | null
          capabilities: Json | null
          category: string
          communication_protocol: string | null
          connection_status: string | null
          created_at: string | null
          created_by: string
          data_stats: Json | null
          data_transmission_interval: number | null
          deleted_at: string | null
          device_id: string
          device_name: string
          device_type: string
          expected_heartbeat_interval: number | null
          firmware_version: string | null
          hardware_version: string | null
          health_metrics: Json | null
          human_requested_fan: boolean | null
          id: string
          ip_address: string | null
          is_enabled: boolean | null
          last_calibration_date: string | null
          last_heartbeat: string | null
          last_maintenance_date: string | null
          mac_address: string | null
          manufacturer: string | null
          ml_decision: string | null
          ml_requested_fan: boolean | null
          model: string | null
          mqtt_topic: string | null
          next_maintenance_date: string | null
          notes: string | null
          power_source: Database["public"]["Enums"]["power_source"] | null
          purchase_date: string | null
          sensor_types: Database["public"]["Enums"]["sensor_type"][] | null
          signal_strength: number | null
          silo_id: string
          status: Database["public"]["Enums"]["device_status"] | null
          tags: string[] | null
          target_fan_speed: number | null
          thresholds: Json | null
          updated_at: string | null
          updated_by: string | null
          warehouse_id: string | null
          warranty_expiry: string | null
          wifi_ssid: string | null
        }
        Insert: {
          admin_id: string
          battery_level?: number | null
          calibration_due_date?: string | null
          calibration_interval_days?: number | null
          capabilities?: Json | null
          category: string
          communication_protocol?: string | null
          connection_status?: string | null
          created_at?: string | null
          created_by: string
          data_stats?: Json | null
          data_transmission_interval?: number | null
          deleted_at?: string | null
          device_id: string
          device_name: string
          device_type: string
          expected_heartbeat_interval?: number | null
          firmware_version?: string | null
          hardware_version?: string | null
          health_metrics?: Json | null
          human_requested_fan?: boolean | null
          id?: string
          ip_address?: string | null
          is_enabled?: boolean | null
          last_calibration_date?: string | null
          last_heartbeat?: string | null
          last_maintenance_date?: string | null
          mac_address?: string | null
          manufacturer?: string | null
          ml_decision?: string | null
          ml_requested_fan?: boolean | null
          model?: string | null
          mqtt_topic?: string | null
          next_maintenance_date?: string | null
          notes?: string | null
          power_source?: Database["public"]["Enums"]["power_source"] | null
          purchase_date?: string | null
          sensor_types?: Database["public"]["Enums"]["sensor_type"][] | null
          signal_strength?: number | null
          silo_id: string
          status?: Database["public"]["Enums"]["device_status"] | null
          tags?: string[] | null
          target_fan_speed?: number | null
          thresholds?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          warehouse_id?: string | null
          warranty_expiry?: string | null
          wifi_ssid?: string | null
        }
        Update: {
          admin_id?: string
          battery_level?: number | null
          calibration_due_date?: string | null
          calibration_interval_days?: number | null
          capabilities?: Json | null
          category?: string
          communication_protocol?: string | null
          connection_status?: string | null
          created_at?: string | null
          created_by?: string
          data_stats?: Json | null
          data_transmission_interval?: number | null
          deleted_at?: string | null
          device_id?: string
          device_name?: string
          device_type?: string
          expected_heartbeat_interval?: number | null
          firmware_version?: string | null
          hardware_version?: string | null
          health_metrics?: Json | null
          human_requested_fan?: boolean | null
          id?: string
          ip_address?: string | null
          is_enabled?: boolean | null
          last_calibration_date?: string | null
          last_heartbeat?: string | null
          last_maintenance_date?: string | null
          mac_address?: string | null
          manufacturer?: string | null
          ml_decision?: string | null
          ml_requested_fan?: boolean | null
          model?: string | null
          mqtt_topic?: string | null
          next_maintenance_date?: string | null
          notes?: string | null
          power_source?: Database["public"]["Enums"]["power_source"] | null
          purchase_date?: string | null
          sensor_types?: Database["public"]["Enums"]["sensor_type"][] | null
          signal_strength?: number | null
          silo_id?: string
          status?: Database["public"]["Enums"]["device_status"] | null
          tags?: string[] | null
          target_fan_speed?: number | null
          thresholds?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          warehouse_id?: string | null
          warranty_expiry?: string | null
          wifi_ssid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sensor_devices_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_devices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_devices_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "silos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_devices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_devices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_readings: {
        Row: {
          admin_id: string
          aggregation_period: string | null
          airflow: number | null
          ambient_humidity: number | null
          ambient_light: number | null
          ambient_temperature: number | null
          anomaly_detected: boolean | null
          batch_id: string | null
          battery_level: number | null
          co2_value: number | null
          condensation_risk: boolean | null
          confidence_score: number | null
          created_at: string | null
          deleted_at: string | null
          device_id: string | null
          dew_point: number | null
          dew_point_gap: number | null
          fan_duty_cycle: number | null
          fan_recommendation: string | null
          fan_rpm: number | null
          fan_speed_factor: number | null
          fan_state: number | null
          fan_status: string | null
          grain_type: string | null
          humidity_value: number | null
          id: string
          is_aggregated: boolean | null
          is_valid: boolean | null
          lid_state: number | null
          light_value: number | null
          ml_confidence: number | null
          ml_risk_class: string | null
          ml_risk_score: number | null
          moisture_value: number | null
          pest_presence_flag: boolean | null
          pest_presence_score: number | null
          ph_value: number | null
          pressure_value: number | null
          raw_payload: Json | null
          reading_timestamp: string
          signal_strength: number | null
          silo_id: string | null
          spoilage_label: string | null
          storage_days: number | null
          temperature_unit: string | null
          temperature_value: number | null
          updated_at: string | null
          voc_baseline_24h: number | null
          voc_rate_30min: number | null
          voc_rate_5min: number | null
          voc_relative: number | null
          voc_relative_30min: number | null
          voc_relative_5min: number | null
          voc_value: number | null
          warehouse_id: string | null
        }
        Insert: {
          admin_id: string
          aggregation_period?: string | null
          airflow?: number | null
          ambient_humidity?: number | null
          ambient_light?: number | null
          ambient_temperature?: number | null
          anomaly_detected?: boolean | null
          batch_id?: string | null
          battery_level?: number | null
          co2_value?: number | null
          condensation_risk?: boolean | null
          confidence_score?: number | null
          created_at?: string | null
          deleted_at?: string | null
          device_id?: string | null
          dew_point?: number | null
          dew_point_gap?: number | null
          fan_duty_cycle?: number | null
          fan_recommendation?: string | null
          fan_rpm?: number | null
          fan_speed_factor?: number | null
          fan_state?: number | null
          fan_status?: string | null
          grain_type?: string | null
          humidity_value?: number | null
          id?: string
          is_aggregated?: boolean | null
          is_valid?: boolean | null
          lid_state?: number | null
          light_value?: number | null
          ml_confidence?: number | null
          ml_risk_class?: string | null
          ml_risk_score?: number | null
          moisture_value?: number | null
          pest_presence_flag?: boolean | null
          pest_presence_score?: number | null
          ph_value?: number | null
          pressure_value?: number | null
          raw_payload?: Json | null
          reading_timestamp?: string
          signal_strength?: number | null
          silo_id?: string | null
          spoilage_label?: string | null
          storage_days?: number | null
          temperature_unit?: string | null
          temperature_value?: number | null
          updated_at?: string | null
          voc_baseline_24h?: number | null
          voc_rate_30min?: number | null
          voc_rate_5min?: number | null
          voc_relative?: number | null
          voc_relative_30min?: number | null
          voc_relative_5min?: number | null
          voc_value?: number | null
          warehouse_id?: string | null
        }
        Update: {
          admin_id?: string
          aggregation_period?: string | null
          airflow?: number | null
          ambient_humidity?: number | null
          ambient_light?: number | null
          ambient_temperature?: number | null
          anomaly_detected?: boolean | null
          batch_id?: string | null
          battery_level?: number | null
          co2_value?: number | null
          condensation_risk?: boolean | null
          confidence_score?: number | null
          created_at?: string | null
          deleted_at?: string | null
          device_id?: string | null
          dew_point?: number | null
          dew_point_gap?: number | null
          fan_duty_cycle?: number | null
          fan_recommendation?: string | null
          fan_rpm?: number | null
          fan_speed_factor?: number | null
          fan_state?: number | null
          fan_status?: string | null
          grain_type?: string | null
          humidity_value?: number | null
          id?: string
          is_aggregated?: boolean | null
          is_valid?: boolean | null
          lid_state?: number | null
          light_value?: number | null
          ml_confidence?: number | null
          ml_risk_class?: string | null
          ml_risk_score?: number | null
          moisture_value?: number | null
          pest_presence_flag?: boolean | null
          pest_presence_score?: number | null
          ph_value?: number | null
          pressure_value?: number | null
          raw_payload?: Json | null
          reading_timestamp?: string
          signal_strength?: number | null
          silo_id?: string | null
          spoilage_label?: string | null
          storage_days?: number | null
          temperature_unit?: string | null
          temperature_value?: number | null
          updated_at?: string | null
          voc_baseline_24h?: number | null
          voc_rate_30min?: number | null
          voc_rate_5min?: number | null
          voc_relative?: number | null
          voc_relative_30min?: number | null
          voc_relative_5min?: number | null
          voc_value?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_readings_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "grain_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_readings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sensor_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_readings_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "silos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_readings_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      silos: {
        Row: {
          admin_id: string
          auto_alerts: boolean | null
          batch_dispatched_date: string | null
          batch_loaded_date: string | null
          capacity_kg: number
          created_at: string | null
          created_by: string
          current_batch_id: string | null
          current_conditions: Json | null
          current_occupancy_kg: number | null
          deleted_at: string | null
          dimensions: Json | null
          id: string
          is_active: boolean | null
          last_cleaning_date: string | null
          last_inspection_date: string | null
          location: Json | null
          name: string
          next_inspection_date: string | null
          notes: string | null
          sensors: Json | null
          silo_id: string
          statistics: Json | null
          status: Database["public"]["Enums"]["device_status"] | null
          tags: string[] | null
          temperature_control: Json | null
          thresholds: Json | null
          updated_at: string | null
          updated_by: string | null
          ventilation_system: Json | null
          warehouse_id: string
        }
        Insert: {
          admin_id: string
          auto_alerts?: boolean | null
          batch_dispatched_date?: string | null
          batch_loaded_date?: string | null
          capacity_kg: number
          created_at?: string | null
          created_by: string
          current_batch_id?: string | null
          current_conditions?: Json | null
          current_occupancy_kg?: number | null
          deleted_at?: string | null
          dimensions?: Json | null
          id?: string
          is_active?: boolean | null
          last_cleaning_date?: string | null
          last_inspection_date?: string | null
          location?: Json | null
          name: string
          next_inspection_date?: string | null
          notes?: string | null
          sensors?: Json | null
          silo_id: string
          statistics?: Json | null
          status?: Database["public"]["Enums"]["device_status"] | null
          tags?: string[] | null
          temperature_control?: Json | null
          thresholds?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          ventilation_system?: Json | null
          warehouse_id: string
        }
        Update: {
          admin_id?: string
          auto_alerts?: boolean | null
          batch_dispatched_date?: string | null
          batch_loaded_date?: string | null
          capacity_kg?: number
          created_at?: string | null
          created_by?: string
          current_batch_id?: string | null
          current_conditions?: Json | null
          current_occupancy_kg?: number | null
          deleted_at?: string | null
          dimensions?: Json | null
          id?: string
          is_active?: boolean | null
          last_cleaning_date?: string | null
          last_inspection_date?: string | null
          location?: Json | null
          name?: string
          next_inspection_date?: string | null
          notes?: string | null
          sensors?: Json | null
          silo_id?: string
          statistics?: Json | null
          status?: Database["public"]["Enums"]["device_status"] | null
          tags?: string[] | null
          temperature_control?: Json | null
          thresholds?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          ventilation_system?: Json | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_silos_current_batch"
            columns: ["current_batch_id"]
            isOneToOne: false
            referencedRelation: "grain_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silos_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silos_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          admin_id: string
          advanced_analytics: boolean | null
          ai_features: boolean | null
          auto_renew: boolean | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null
          cancellation_date: string | null
          cancellation_reason: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          custom_integrations: boolean | null
          deleted_at: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string
          id: string
          last_payment_date: string | null
          max_batches: number | null
          max_devices: number | null
          max_storage_gb: number | null
          max_users: number | null
          next_payment_date: string | null
          notes: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          plan_description: string | null
          plan_name: Database["public"]["Enums"]["plan_name"]
          price_per_month: number
          price_per_year: number | null
          priority_support: boolean | null
          promo_code: string | null
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end_date: string | null
          updated_at: string | null
          usage_batches: number | null
          usage_devices: number | null
          usage_storage_gb: number | null
          usage_users: number | null
        }
        Insert: {
          admin_id: string
          advanced_analytics?: boolean | null
          ai_features?: boolean | null
          auto_renew?: boolean | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_integrations?: boolean | null
          deleted_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date: string
          id?: string
          last_payment_date?: string | null
          max_batches?: number | null
          max_devices?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          next_payment_date?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          plan_description?: string | null
          plan_name?: Database["public"]["Enums"]["plan_name"]
          price_per_month?: number
          price_per_year?: number | null
          priority_support?: boolean | null
          promo_code?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
          usage_batches?: number | null
          usage_devices?: number | null
          usage_storage_gb?: number | null
          usage_users?: number | null
        }
        Update: {
          admin_id?: string
          advanced_analytics?: boolean | null
          ai_features?: boolean | null
          auto_renew?: boolean | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_integrations?: boolean | null
          deleted_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string
          id?: string
          last_payment_date?: string | null
          max_batches?: number | null
          max_devices?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          next_payment_date?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          plan_description?: string | null
          plan_name?: Database["public"]["Enums"]["plan_name"]
          price_per_month?: number
          price_per_year?: number | null
          priority_support?: boolean | null
          promo_code?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
          usage_batches?: number | null
          usage_devices?: number | null
          usage_storage_gb?: number | null
          usage_users?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist_emails: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          admin_id: string
          auto_alerts: boolean | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          id: string
          is_active: boolean | null
          location: Json | null
          manager_id: string | null
          name: string
          notes: string | null
          statistics: Json | null
          status: Database["public"]["Enums"]["device_status"] | null
          tags: string[] | null
          technician_ids: string[] | null
          total_capacity_kg: number | null
          total_silos: number | null
          updated_at: string | null
          updated_by: string | null
          warehouse_id: string
        }
        Insert: {
          admin_id: string
          auto_alerts?: boolean | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: Json | null
          manager_id?: string | null
          name: string
          notes?: string | null
          statistics?: Json | null
          status?: Database["public"]["Enums"]["device_status"] | null
          tags?: string[] | null
          technician_ids?: string[] | null
          total_capacity_kg?: number | null
          total_silos?: number | null
          updated_at?: string | null
          updated_by?: string | null
          warehouse_id: string
        }
        Update: {
          admin_id?: string
          auto_alerts?: boolean | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: Json | null
          manager_id?: string | null
          name?: string
          notes?: string | null
          statistics?: Json | null
          status?: Database["public"]["Enums"]["device_status"] | null
          tags?: string[] | null
          technician_ids?: string[] | null
          total_capacity_kg?: number | null
          total_silos?: number | null
          updated_at?: string | null
          updated_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_tenant_admin_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      actuator_type: "fan" | "vent" | "heater" | "cooler" | "alarm" | "light"
      alert_priority: "low" | "medium" | "high" | "critical"
      alert_status: "pending" | "acknowledged" | "resolved" | "escalated"
      app_role: "super_admin" | "admin" | "manager" | "technician" | "pending"
      batch_status:
        | "stored"
        | "dispatched"
        | "sold"
        | "damaged"
        | "expired"
        | "on_hold"
        | "processing"
      billing_cycle: "monthly" | "yearly" | "quarterly"
      buyer_status: "active" | "paused" | "inactive"
      buyer_type:
        | "local_mill"
        | "exporter"
        | "wholesaler"
        | "retailer"
        | "government"
      device_status: "active" | "offline" | "error" | "maintenance"
      grain_type: "Wheat" | "Rice" | "Maize" | "Corn" | "Barley" | "Sorghum"
      notification_cat:
        | "batch"
        | "spoilage"
        | "dispatch"
        | "payment"
        | "insurance"
        | "invoice"
        | "system"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
      plan_name:
        | "Grain Starter"
        | "Grain Professional"
        | "Grain Enterprise"
        | "Grain Enterprise Plus"
        | "Custom"
      power_source: "solar" | "battery" | "direct" | "hybrid"
      sensor_type:
        | "temperature"
        | "humidity"
        | "co2"
        | "voc"
        | "moisture"
        | "light"
        | "pressure"
        | "ph"
      spoilage_label: "Safe" | "Risky" | "Spoiled"
      subscription_status:
        | "active"
        | "inactive"
        | "cancelled"
        | "expired"
        | "trial"
      user_status: "active" | "inactive" | "deleted"
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
      actuator_type: ["fan", "vent", "heater", "cooler", "alarm", "light"],
      alert_priority: ["low", "medium", "high", "critical"],
      alert_status: ["pending", "acknowledged", "resolved", "escalated"],
      app_role: ["super_admin", "admin", "manager", "technician", "pending"],
      batch_status: [
        "stored",
        "dispatched",
        "sold",
        "damaged",
        "expired",
        "on_hold",
        "processing",
      ],
      billing_cycle: ["monthly", "yearly", "quarterly"],
      buyer_status: ["active", "paused", "inactive"],
      buyer_type: [
        "local_mill",
        "exporter",
        "wholesaler",
        "retailer",
        "government",
      ],
      device_status: ["active", "offline", "error", "maintenance"],
      grain_type: ["Wheat", "Rice", "Maize", "Corn", "Barley", "Sorghum"],
      notification_cat: [
        "batch",
        "spoilage",
        "dispatch",
        "payment",
        "insurance",
        "invoice",
        "system",
      ],
      payment_status: ["pending", "paid", "failed", "refunded", "cancelled"],
      plan_name: [
        "Grain Starter",
        "Grain Professional",
        "Grain Enterprise",
        "Grain Enterprise Plus",
        "Custom",
      ],
      power_source: ["solar", "battery", "direct", "hybrid"],
      sensor_type: [
        "temperature",
        "humidity",
        "co2",
        "voc",
        "moisture",
        "light",
        "pressure",
        "ph",
      ],
      spoilage_label: ["Safe", "Risky", "Spoiled"],
      subscription_status: [
        "active",
        "inactive",
        "cancelled",
        "expired",
        "trial",
      ],
      user_status: ["active", "inactive", "deleted"],
    },
  },
} as const
