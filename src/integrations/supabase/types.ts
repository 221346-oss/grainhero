export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          admin_id: string;
          category: string;
          created_at: string;
          description: string;
          entity_id: string | null;
          entity_ref: string | null;
          entity_type: string | null;
          id: string;
          ip_address: string | null;
          metadata: Json;
          severity: string;
          user_id: string | null;
          user_name: string | null;
          user_role: string | null;
        };
        Insert: {
          action: string;
          admin_id: string;
          category?: string;
          created_at?: string;
          description: string;
          entity_id?: string | null;
          entity_ref?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: string | null;
          metadata?: Json;
          severity?: string;
          user_id?: string | null;
          user_name?: string | null;
          user_role?: string | null;
        };
        Update: {
          action?: string;
          admin_id?: string;
          category?: string;
          created_at?: string;
          description?: string;
          entity_id?: string | null;
          entity_ref?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: string | null;
          metadata?: Json;
          severity?: string;
          user_id?: string | null;
          user_name?: string | null;
          user_role?: string | null;
        };
        Relationships: [];
      };
      actuator_commands: {
        Row: {
          ack_at: string | null;
          actuator_id: string;
          admin_id: string;
          command: string;
          correlation_id: string;
          created_at: string;
          error: string | null;
          expires_at: string;
          id: string;
          issued_by: string | null;
          params: Json;
          sent_at: string | null;
          source: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          ack_at?: string | null;
          actuator_id: string;
          admin_id: string;
          command: string;
          correlation_id?: string;
          created_at?: string;
          error?: string | null;
          expires_at?: string;
          id?: string;
          issued_by?: string | null;
          params?: Json;
          sent_at?: string | null;
          source?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          ack_at?: string | null;
          actuator_id?: string;
          admin_id?: string;
          command?: string;
          correlation_id?: string;
          created_at?: string;
          error?: string | null;
          expires_at?: string;
          id?: string;
          issued_by?: string | null;
          params?: Json;
          sent_at?: string | null;
          source?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      actuators: {
        Row: {
          actuator_id: string;
          actuator_type: Database["public"]["Enums"]["actuator_type"];
          admin_id: string;
          ai_control: Json | null;
          control_mode: string | null;
          created_at: string | null;
          created_by: string;
          current_operation: Json | null;
          deleted_at: string | null;
          health_metrics: Json | null;
          human_requested_fan: boolean | null;
          id: string;
          is_enabled: boolean | null;
          is_on: boolean | null;
          last_maintenance_date: string | null;
          mac_address: string | null;
          manufacturer: string | null;
          ml_decision: string | null;
          ml_requested_fan: boolean | null;
          model: string | null;
          name: string;
          next_maintenance_date: string | null;
          notes: string | null;
          performance_metrics: Json | null;
          power_level: number | null;
          safety_limits: Json | null;
          schedule: Json | null;
          silo_id: string;
          status: string | null;
          tags: string[] | null;
          target_fan_speed: number | null;
          thresholds: Json | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          actuator_id: string;
          actuator_type: Database["public"]["Enums"]["actuator_type"];
          admin_id: string;
          ai_control?: Json | null;
          control_mode?: string | null;
          created_at?: string | null;
          created_by: string;
          current_operation?: Json | null;
          deleted_at?: string | null;
          health_metrics?: Json | null;
          human_requested_fan?: boolean | null;
          id?: string;
          is_enabled?: boolean | null;
          is_on?: boolean | null;
          last_maintenance_date?: string | null;
          mac_address?: string | null;
          manufacturer?: string | null;
          ml_decision?: string | null;
          ml_requested_fan?: boolean | null;
          model?: string | null;
          name: string;
          next_maintenance_date?: string | null;
          notes?: string | null;
          performance_metrics?: Json | null;
          power_level?: number | null;
          safety_limits?: Json | null;
          schedule?: Json | null;
          silo_id: string;
          status?: string | null;
          tags?: string[] | null;
          target_fan_speed?: number | null;
          thresholds?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          actuator_id?: string;
          actuator_type?: Database["public"]["Enums"]["actuator_type"];
          admin_id?: string;
          ai_control?: Json | null;
          control_mode?: string | null;
          created_at?: string | null;
          created_by?: string;
          current_operation?: Json | null;
          deleted_at?: string | null;
          health_metrics?: Json | null;
          human_requested_fan?: boolean | null;
          id?: string;
          is_enabled?: boolean | null;
          is_on?: boolean | null;
          last_maintenance_date?: string | null;
          mac_address?: string | null;
          manufacturer?: string | null;
          ml_decision?: string | null;
          ml_requested_fan?: boolean | null;
          model?: string | null;
          name?: string;
          next_maintenance_date?: string | null;
          notes?: string | null;
          performance_metrics?: Json | null;
          power_level?: number | null;
          safety_limits?: Json | null;
          schedule?: Json | null;
          silo_id?: string;
          status?: string | null;
          tags?: string[] | null;
          target_fan_speed?: number | null;
          thresholds?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "actuators_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actuators_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "actuators_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actuators_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "actuators_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actuators_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actuators_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actuators_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      analytics_governance_audit: {
        Row: {
          action: string;
          actor_user_id: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          id: string;
          ip: string | null;
          target_key: string | null;
          target_type: string;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: string;
          ip?: string | null;
          target_key?: string | null;
          target_type: string;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: string;
          ip?: string | null;
          target_key?: string | null;
          target_type?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      analytics_refresh_log: {
        Row: {
          error: string | null;
          fact_name: string;
          finished_at: string | null;
          id: string;
          rows_upserted: number | null;
          started_at: string;
        };
        Insert: {
          error?: string | null;
          fact_name: string;
          finished_at?: string | null;
          id?: string;
          rows_upserted?: number | null;
          started_at?: string;
        };
        Update: {
          error?: string | null;
          fact_name?: string;
          finished_at?: string | null;
          id?: string;
          rows_upserted?: number | null;
          started_at?: string;
        };
        Relationships: [];
      };
      automation_rules: {
        Row: {
          actuator_id: string;
          admin_id: string;
          command: string;
          command_params: Json;
          cooldown_seconds: number;
          created_at: string;
          enabled: boolean;
          id: string;
          last_fired_at: string | null;
          silo_id: string;
          trigger_metric: string;
          trigger_op: string;
          trigger_value: number;
          updated_at: string;
        };
        Insert: {
          actuator_id: string;
          admin_id: string;
          command: string;
          command_params?: Json;
          cooldown_seconds?: number;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          last_fired_at?: string | null;
          silo_id: string;
          trigger_metric: string;
          trigger_op: string;
          trigger_value: number;
          updated_at?: string;
        };
        Update: {
          actuator_id?: string;
          admin_id?: string;
          command?: string;
          command_params?: Json;
          cooldown_seconds?: number;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          last_fired_at?: string | null;
          silo_id?: string;
          trigger_metric?: string;
          trigger_op?: string;
          trigger_value?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "automation_rules_actuator_id_fkey";
            columns: ["actuator_id"];
            isOneToOne: false;
            referencedRelation: "actuators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "automation_rules_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "automation_rules_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
        ];
      };
      batch_quality_certificates: {
        Row: {
          admin_id: string;
          batch_id: string | null;
          created_at: string;
          document_url: string | null;
          expires_at: string | null;
          foreign_matter_pct: number | null;
          id: string;
          issued_at: string | null;
          issued_by: string | null;
          lab_name: string | null;
          metrics: Json;
          moisture_pct: number | null;
          purity_pct: number | null;
          updated_at: string;
          verified: boolean;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          admin_id: string;
          batch_id?: string | null;
          created_at?: string;
          document_url?: string | null;
          expires_at?: string | null;
          foreign_matter_pct?: number | null;
          id?: string;
          issued_at?: string | null;
          issued_by?: string | null;
          lab_name?: string | null;
          metrics?: Json;
          moisture_pct?: number | null;
          purity_pct?: number | null;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          admin_id?: string;
          batch_id?: string | null;
          created_at?: string;
          document_url?: string | null;
          expires_at?: string | null;
          foreign_matter_pct?: number | null;
          id?: string;
          issued_at?: string | null;
          issued_by?: string | null;
          lab_name?: string | null;
          metrics?: Json;
          moisture_pct?: number | null;
          purity_pct?: number | null;
          updated_at?: string;
          verified?: boolean;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "batch_quality_certificates_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      bug_reports: {
        Row: {
          admin_id: string | null;
          category: string;
          created_at: string;
          description: string;
          id: string;
          page_path: string | null;
          status: string;
          updated_at: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          admin_id?: string | null;
          category?: string;
          created_at?: string;
          description: string;
          id?: string;
          page_path?: string | null;
          status?: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          admin_id?: string | null;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          page_path?: string | null;
          status?: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      buyer_accounts: {
        Row: {
          buyer_id: string | null;
          company_name: string | null;
          contact_phone: string | null;
          created_at: string;
          default_shipping_address: Json | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          buyer_id?: string | null;
          company_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          default_shipping_address?: Json | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          buyer_id?: string | null;
          company_name?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          default_shipping_address?: Json | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_accounts_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "buyers";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_addresses: {
        Row: {
          buyer_id: string;
          city: string;
          country: string;
          created_at: string;
          id: string;
          is_default: boolean;
          label: string | null;
          line1: string;
          line2: string | null;
          phone: string | null;
          postal: string | null;
          recipient: string;
          region: string | null;
          updated_at: string;
        };
        Insert: {
          buyer_id: string;
          city: string;
          country: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          line1: string;
          line2?: string | null;
          phone?: string | null;
          postal?: string | null;
          recipient: string;
          region?: string | null;
          updated_at?: string;
        };
        Update: {
          buyer_id?: string;
          city?: string;
          country?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          label?: string | null;
          line1?: string;
          line2?: string | null;
          phone?: string | null;
          postal?: string | null;
          recipient?: string;
          region?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      buyer_carts: {
        Row: {
          buyer_id: string;
          created_at: string;
          currency: string;
          expires_at: string | null;
          id: string;
          items: Json;
          subtotal_cents: number;
          updated_at: string;
        };
        Insert: {
          buyer_id: string;
          created_at?: string;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          items?: Json;
          subtotal_cents?: number;
          updated_at?: string;
        };
        Update: {
          buyer_id?: string;
          created_at?: string;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          items?: Json;
          subtotal_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      buyer_dispute_events: {
        Row: {
          action: string;
          actor_user_id: string | null;
          at: string;
          dispute_id: string;
          id: string;
          note: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          at?: string;
          dispute_id: string;
          id?: string;
          note?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          at?: string;
          dispute_id?: string;
          id?: string;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_dispute_events_dispute_id_fkey";
            columns: ["dispute_id"];
            isOneToOne: false;
            referencedRelation: "buyer_disputes";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_disputes: {
        Row: {
          admin_id: string;
          attachments: Json;
          buyer_id: string;
          category: string;
          closed_at: string | null;
          created_at: string;
          description: string;
          evidence_urls: string[];
          id: string;
          moderated_by: string | null;
          opened_at: string;
          order_id: string;
          refund_amount: number | null;
          resolution_key: string | null;
          resolution_note: string | null;
          status: Database["public"]["Enums"]["dispute_status"];
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          attachments?: Json;
          buyer_id: string;
          category: string;
          closed_at?: string | null;
          created_at?: string;
          description: string;
          evidence_urls?: string[];
          id?: string;
          moderated_by?: string | null;
          opened_at?: string;
          order_id: string;
          refund_amount?: number | null;
          resolution_key?: string | null;
          resolution_note?: string | null;
          status?: Database["public"]["Enums"]["dispute_status"];
          updated_at?: string;
        };
        Update: {
          admin_id?: string;
          attachments?: Json;
          buyer_id?: string;
          category?: string;
          closed_at?: string | null;
          created_at?: string;
          description?: string;
          evidence_urls?: string[];
          id?: string;
          moderated_by?: string | null;
          opened_at?: string;
          order_id?: string;
          refund_amount?: number | null;
          resolution_key?: string | null;
          resolution_note?: string | null;
          status?: Database["public"]["Enums"]["dispute_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_disputes_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_invoices: {
        Row: {
          admin_id: string;
          amount_paid: number | null;
          batch_id: string | null;
          batch_ref: string | null;
          buyer_company: string | null;
          buyer_contact: Json | null;
          buyer_id: string;
          buyer_name: string | null;
          created_at: string | null;
          created_by: string;
          currency: string | null;
          dispatch_id: string | null;
          due_date: string | null;
          email_attempts: number;
          email_error: string | null;
          email_last_attempt_at: string | null;
          email_status: string | null;
          emailed: boolean | null;
          emailed_at: string | null;
          id: string;
          invoice_number: string;
          items: Json | null;
          notes: string | null;
          order_id: string | null;
          paid_at: string | null;
          paid_via: string | null;
          payment_method: string | null;
          payment_status: string | null;
          pdf_url: string | null;
          stripe_payment_intent_id: string | null;
          subtotal: number;
          total_amount: number;
          updated_at: string | null;
        };
        Insert: {
          admin_id: string;
          amount_paid?: number | null;
          batch_id?: string | null;
          batch_ref?: string | null;
          buyer_company?: string | null;
          buyer_contact?: Json | null;
          buyer_id: string;
          buyer_name?: string | null;
          created_at?: string | null;
          created_by: string;
          currency?: string | null;
          dispatch_id?: string | null;
          due_date?: string | null;
          email_attempts?: number;
          email_error?: string | null;
          email_last_attempt_at?: string | null;
          email_status?: string | null;
          emailed?: boolean | null;
          emailed_at?: string | null;
          id?: string;
          invoice_number: string;
          items?: Json | null;
          notes?: string | null;
          order_id?: string | null;
          paid_at?: string | null;
          paid_via?: string | null;
          payment_method?: string | null;
          payment_status?: string | null;
          pdf_url?: string | null;
          stripe_payment_intent_id?: string | null;
          subtotal?: number;
          total_amount?: number;
          updated_at?: string | null;
        };
        Update: {
          admin_id?: string;
          amount_paid?: number | null;
          batch_id?: string | null;
          batch_ref?: string | null;
          buyer_company?: string | null;
          buyer_contact?: Json | null;
          buyer_id?: string;
          buyer_name?: string | null;
          created_at?: string | null;
          created_by?: string;
          currency?: string | null;
          dispatch_id?: string | null;
          due_date?: string | null;
          email_attempts?: number;
          email_error?: string | null;
          email_last_attempt_at?: string | null;
          email_status?: string | null;
          emailed?: boolean | null;
          emailed_at?: string | null;
          id?: string;
          invoice_number?: string;
          items?: Json | null;
          notes?: string | null;
          order_id?: string | null;
          paid_at?: string | null;
          paid_via?: string | null;
          payment_method?: string | null;
          payment_status?: string | null;
          pdf_url?: string | null;
          stripe_payment_intent_id?: string | null;
          subtotal?: number;
          total_amount?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_invoices_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_invoices_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "buyer_invoices_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_invoices_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "buyers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_invoices_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_invoices_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "buyer_invoices_dispatch_id_fkey";
            columns: ["dispatch_id"];
            isOneToOne: false;
            referencedRelation: "grain_dispatches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_invoices_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_order_events: {
        Row: {
          actor_user_id: string | null;
          admin_id: string;
          created_at: string;
          from_state: Database["public"]["Enums"]["buyer_order_status"] | null;
          id: string;
          meta: Json | null;
          note: string | null;
          order_id: string;
          to_state: Database["public"]["Enums"]["buyer_order_status"];
        };
        Insert: {
          actor_user_id?: string | null;
          admin_id: string;
          created_at?: string;
          from_state?: Database["public"]["Enums"]["buyer_order_status"] | null;
          id?: string;
          meta?: Json | null;
          note?: string | null;
          order_id: string;
          to_state: Database["public"]["Enums"]["buyer_order_status"];
        };
        Update: {
          actor_user_id?: string | null;
          admin_id?: string;
          created_at?: string;
          from_state?: Database["public"]["Enums"]["buyer_order_status"] | null;
          id?: string;
          meta?: Json | null;
          note?: string | null;
          order_id?: string;
          to_state?: Database["public"]["Enums"]["buyer_order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "buyer_order_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_order_messages: {
        Row: {
          admin_id: string;
          attachments: Json;
          body: string;
          created_at: string;
          id: string;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_reason: string | null;
          order_id: string;
          read_by_buyer_at: string | null;
          read_by_seller_at: string | null;
          sender_role: string;
          sender_user_id: string;
        };
        Insert: {
          admin_id: string;
          attachments?: Json;
          body: string;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_reason?: string | null;
          order_id: string;
          read_by_buyer_at?: string | null;
          read_by_seller_at?: string | null;
          sender_role: string;
          sender_user_id: string;
        };
        Update: {
          admin_id?: string;
          attachments?: Json;
          body?: string;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_reason?: string | null;
          order_id?: string;
          read_by_buyer_at?: string | null;
          read_by_seller_at?: string | null;
          sender_role?: string;
          sender_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_order_messages_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_order_weight_reconciliation: {
        Row: {
          admin_id: string;
          auto_flagged: boolean;
          created_at: string;
          dispatched_at: string | null;
          dispatched_by: string | null;
          dispatched_weight_kg: number | null;
          id: string;
          order_id: string;
          received_at: string | null;
          received_by: string | null;
          received_weight_kg: number | null;
          return_id: string | null;
          updated_at: string;
          variance_pct: number | null;
        };
        Insert: {
          admin_id: string;
          auto_flagged?: boolean;
          created_at?: string;
          dispatched_at?: string | null;
          dispatched_by?: string | null;
          dispatched_weight_kg?: number | null;
          id?: string;
          order_id: string;
          received_at?: string | null;
          received_by?: string | null;
          received_weight_kg?: number | null;
          return_id?: string | null;
          updated_at?: string;
          variance_pct?: number | null;
        };
        Update: {
          admin_id?: string;
          auto_flagged?: boolean;
          created_at?: string;
          dispatched_at?: string | null;
          dispatched_by?: string | null;
          dispatched_weight_kg?: number | null;
          id?: string;
          order_id?: string;
          received_at?: string | null;
          received_by?: string | null;
          received_weight_kg?: number | null;
          return_id?: string | null;
          updated_at?: string;
          variance_pct?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_order_weight_reconciliation_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_order_weight_reconciliation_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "buyer_returns";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_orders: {
        Row: {
          admin_id: string;
          batch_id: string | null;
          buyer_account_id: string | null;
          buyer_id: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          channel: string;
          checkout_url: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          delivered_at: string | null;
          dispatched_at: string | null;
          expected_delivery_date: string | null;
          id: string;
          invoice_pdf_url: string | null;
          listing_id: string;
          messages_count: number;
          notes: string | null;
          order_number: string;
          paid_at: string | null;
          payment_channel: string;
          placed_by: string | null;
          quantity_kg: number;
          refund_status: string | null;
          review_prompt_sent_at: string | null;
          shipment_id: string | null;
          shipping_address: Json | null;
          status: Database["public"]["Enums"]["buyer_order_status"];
          stripe_payment_intent: string | null;
          stripe_session_id: string | null;
          subtotal: number;
          unit_price: number;
          unread_buyer_messages: number;
          unread_seller_messages: number;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          batch_id?: string | null;
          buyer_account_id?: string | null;
          buyer_id: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          channel?: string;
          checkout_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          delivered_at?: string | null;
          dispatched_at?: string | null;
          expected_delivery_date?: string | null;
          id?: string;
          invoice_pdf_url?: string | null;
          listing_id: string;
          messages_count?: number;
          notes?: string | null;
          order_number: string;
          paid_at?: string | null;
          payment_channel?: string;
          placed_by?: string | null;
          quantity_kg: number;
          refund_status?: string | null;
          review_prompt_sent_at?: string | null;
          shipment_id?: string | null;
          shipping_address?: Json | null;
          status?: Database["public"]["Enums"]["buyer_order_status"];
          stripe_payment_intent?: string | null;
          stripe_session_id?: string | null;
          subtotal: number;
          unit_price: number;
          unread_buyer_messages?: number;
          unread_seller_messages?: number;
          updated_at?: string;
        };
        Update: {
          admin_id?: string;
          batch_id?: string | null;
          buyer_account_id?: string | null;
          buyer_id?: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          channel?: string;
          checkout_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          delivered_at?: string | null;
          dispatched_at?: string | null;
          expected_delivery_date?: string | null;
          id?: string;
          invoice_pdf_url?: string | null;
          listing_id?: string;
          messages_count?: number;
          notes?: string | null;
          order_number?: string;
          paid_at?: string | null;
          payment_channel?: string;
          placed_by?: string | null;
          quantity_kg?: number;
          refund_status?: string | null;
          review_prompt_sent_at?: string | null;
          shipment_id?: string | null;
          shipping_address?: Json | null;
          status?: Database["public"]["Enums"]["buyer_order_status"];
          stripe_payment_intent?: string | null;
          stripe_session_id?: string | null;
          subtotal?: number;
          unit_price?: number;
          unread_buyer_messages?: number;
          unread_seller_messages?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_orders_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_orders_buyer_account_id_fkey";
            columns: ["buyer_account_id"];
            isOneToOne: false;
            referencedRelation: "buyer_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_orders_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "buyers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_orders_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "grain_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_orders_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "mobile_marketplace_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_orders_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "public_listings_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_orders_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "buyer_shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_payment_intents: {
        Row: {
          amount_cents: number;
          channel: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          order_id: string | null;
          platform_fee_cents: number;
          raw: Json;
          status: string;
          stripe_pi_id: string;
          updated_at: string;
        };
        Insert: {
          amount_cents: number;
          channel?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          order_id?: string | null;
          platform_fee_cents?: number;
          raw?: Json;
          status?: string;
          stripe_pi_id: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          channel?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          order_id?: string | null;
          platform_fee_cents?: number;
          raw?: Json;
          status?: string;
          stripe_pi_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_payment_intents_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_payments: {
        Row: {
          admin_id: string;
          amount: number;
          batch_id: string | null;
          buyer_id: string;
          created_at: string | null;
          currency: string | null;
          dispatch_id: string | null;
          id: string;
          invoice_id: string | null;
          notes: string | null;
          ocr_extracted: Json | null;
          payment_date: string | null;
          payment_method: string;
          payment_reference: string | null;
          receipt_url: string | null;
          recorded_by: string;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          admin_id: string;
          amount: number;
          batch_id?: string | null;
          buyer_id: string;
          created_at?: string | null;
          currency?: string | null;
          dispatch_id?: string | null;
          id?: string;
          invoice_id?: string | null;
          notes?: string | null;
          ocr_extracted?: Json | null;
          payment_date?: string | null;
          payment_method: string;
          payment_reference?: string | null;
          receipt_url?: string | null;
          recorded_by: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          admin_id?: string;
          amount?: number;
          batch_id?: string | null;
          buyer_id?: string;
          created_at?: string | null;
          currency?: string | null;
          dispatch_id?: string | null;
          id?: string;
          invoice_id?: string | null;
          notes?: string | null;
          ocr_extracted?: Json | null;
          payment_date?: string | null;
          payment_method?: string;
          payment_reference?: string | null;
          receipt_url?: string | null;
          recorded_by?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_payments_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_payments_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "buyer_payments_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_payments_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "buyers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_payments_dispatch_id_fkey";
            columns: ["dispatch_id"];
            isOneToOne: false;
            referencedRelation: "grain_dispatches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "buyer_invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_payments_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_payments_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      buyer_refunds: {
        Row: {
          admin_id: string;
          amount: number;
          created_at: string;
          created_by: string | null;
          currency: string;
          dispute_id: string | null;
          id: string;
          invoice_id: string | null;
          order_id: string;
          reason_key: string | null;
          status: Database["public"]["Enums"]["refund_state"];
          stripe_refund_id: string | null;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          amount: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          dispute_id?: string | null;
          id?: string;
          invoice_id?: string | null;
          order_id: string;
          reason_key?: string | null;
          status?: Database["public"]["Enums"]["refund_state"];
          stripe_refund_id?: string | null;
          updated_at?: string;
        };
        Update: {
          admin_id?: string;
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          dispute_id?: string | null;
          id?: string;
          invoice_id?: string | null;
          order_id?: string;
          reason_key?: string | null;
          status?: Database["public"]["Enums"]["refund_state"];
          stripe_refund_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_refunds_dispute_id_fkey";
            columns: ["dispute_id"];
            isOneToOne: false;
            referencedRelation: "buyer_disputes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_refunds_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "buyer_invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_refunds_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_return_events: {
        Row: {
          actor_role: string | null;
          actor_user_id: string | null;
          created_at: string;
          from_state: string | null;
          id: string;
          note: string | null;
          return_id: string;
          to_state: string;
        };
        Insert: {
          actor_role?: string | null;
          actor_user_id?: string | null;
          created_at?: string;
          from_state?: string | null;
          id?: string;
          note?: string | null;
          return_id: string;
          to_state: string;
        };
        Update: {
          actor_role?: string | null;
          actor_user_id?: string | null;
          created_at?: string;
          from_state?: string | null;
          id?: string;
          note?: string | null;
          return_id?: string;
          to_state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_return_events_return_id_fkey";
            columns: ["return_id"];
            isOneToOne: false;
            referencedRelation: "buyer_returns";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_returns: {
        Row: {
          admin_id: string;
          attachments: Json;
          auto_flagged: boolean;
          buyer_user_id: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          order_id: string;
          reason_key: string;
          reason_label: string | null;
          refund_id: string | null;
          requested_at: string;
          requested_qty: number | null;
          resolution: string | null;
          resolved_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          attachments?: Json;
          auto_flagged?: boolean;
          buyer_user_id?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_id: string;
          reason_key: string;
          reason_label?: string | null;
          refund_id?: string | null;
          requested_at?: string;
          requested_qty?: number | null;
          resolution?: string | null;
          resolved_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          admin_id?: string;
          attachments?: Json;
          auto_flagged?: boolean;
          buyer_user_id?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          order_id?: string;
          reason_key?: string;
          reason_label?: string | null;
          refund_id?: string | null;
          requested_at?: string;
          requested_qty?: number | null;
          resolution?: string | null;
          resolved_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_returns_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_returns_refund_id_fkey";
            columns: ["refund_id"];
            isOneToOne: false;
            referencedRelation: "buyer_refunds";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_review_helpful: {
        Row: {
          buyer_account_id: string;
          created_at: string;
          id: string;
          review_id: string;
        };
        Insert: {
          buyer_account_id: string;
          created_at?: string;
          id?: string;
          review_id: string;
        };
        Update: {
          buyer_account_id?: string;
          created_at?: string;
          id?: string;
          review_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_review_helpful_buyer_account_id_fkey";
            columns: ["buyer_account_id"];
            isOneToOne: false;
            referencedRelation: "buyer_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_review_helpful_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "buyer_reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_reviews: {
        Row: {
          admin_id: string;
          body: string | null;
          buyer_account_id: string | null;
          created_at: string;
          direction: Database["public"]["Enums"]["review_direction"];
          helpful_count: number;
          id: string;
          moderated_at: string | null;
          moderated_by: string | null;
          order_id: string;
          rating: number;
          reported_at: string | null;
          reported_reason: string | null;
          reviewer_user_id: string;
          seller_response: string | null;
          seller_response_at: string | null;
          status: Database["public"]["Enums"]["review_status"];
          title: string | null;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          body?: string | null;
          buyer_account_id?: string | null;
          created_at?: string;
          direction: Database["public"]["Enums"]["review_direction"];
          helpful_count?: number;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          order_id: string;
          rating: number;
          reported_at?: string | null;
          reported_reason?: string | null;
          reviewer_user_id: string;
          seller_response?: string | null;
          seller_response_at?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          admin_id?: string;
          body?: string | null;
          buyer_account_id?: string | null;
          created_at?: string;
          direction?: Database["public"]["Enums"]["review_direction"];
          helpful_count?: number;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          order_id?: string;
          rating?: number;
          reported_at?: string | null;
          reported_reason?: string | null;
          reviewer_user_id?: string;
          seller_response?: string | null;
          seller_response_at?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_reviews_buyer_account_id_fkey";
            columns: ["buyer_account_id"];
            isOneToOne: false;
            referencedRelation: "buyer_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyer_reviews_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_saved_payment_methods: {
        Row: {
          brand: string | null;
          buyer_id: string;
          created_at: string;
          exp_month: number | null;
          exp_year: number | null;
          id: string;
          is_default: boolean;
          last4: string | null;
          stripe_pm_id: string;
          updated_at: string;
        };
        Insert: {
          brand?: string | null;
          buyer_id: string;
          created_at?: string;
          exp_month?: number | null;
          exp_year?: number | null;
          id?: string;
          is_default?: boolean;
          last4?: string | null;
          stripe_pm_id: string;
          updated_at?: string;
        };
        Update: {
          brand?: string | null;
          buyer_id?: string;
          created_at?: string;
          exp_month?: number | null;
          exp_year?: number | null;
          id?: string;
          is_default?: boolean;
          last4?: string | null;
          stripe_pm_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      buyer_shipment_events: {
        Row: {
          actor_name: string | null;
          actor_role: string | null;
          actor_user_id: string | null;
          at: string;
          code: string;
          created_at: string;
          id: string;
          label: string;
          location: string | null;
          note: string | null;
          shipment_id: string;
          source: string;
        };
        Insert: {
          actor_name?: string | null;
          actor_role?: string | null;
          actor_user_id?: string | null;
          at?: string;
          code: string;
          created_at?: string;
          id?: string;
          label: string;
          location?: string | null;
          note?: string | null;
          shipment_id: string;
          source?: string;
        };
        Update: {
          actor_name?: string | null;
          actor_role?: string | null;
          actor_user_id?: string | null;
          at?: string;
          code?: string;
          created_at?: string;
          id?: string;
          label?: string;
          location?: string | null;
          note?: string | null;
          shipment_id?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_shipment_events_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "buyer_shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      buyer_shipments: {
        Row: {
          admin_id: string;
          courier_key: string;
          courier_label: string | null;
          created_at: string;
          delivered_at: string | null;
          dispatched_at: string | null;
          expected_delivery_at: string | null;
          id: string;
          notes: string | null;
          order_id: string;
          status: Database["public"]["Enums"]["shipment_status"];
          tracking_number: string | null;
          tracking_url: string | null;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          courier_key: string;
          courier_label?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          dispatched_at?: string | null;
          expected_delivery_at?: string | null;
          id?: string;
          notes?: string | null;
          order_id: string;
          status?: Database["public"]["Enums"]["shipment_status"];
          tracking_number?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
        };
        Update: {
          admin_id?: string;
          courier_key?: string;
          courier_label?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          dispatched_at?: string | null;
          expected_delivery_at?: string | null;
          id?: string;
          notes?: string | null;
          order_id?: string;
          status?: Database["public"]["Enums"]["shipment_status"];
          tracking_number?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_shipments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      buyers: {
        Row: {
          address: string | null;
          admin_id: string;
          buyer_type: Database["public"]["Enums"]["buyer_type"] | null;
          city: string | null;
          company_name: string | null;
          contact_designation: string | null;
          contact_email: string | null;
          contact_name: string;
          contact_phone: string | null;
          country: string | null;
          created_at: string | null;
          deleted_at: string | null;
          id: string;
          last_interaction_at: string | null;
          last_order_at: string | null;
          name: string;
          notes: string | null;
          preferred_grain_types: Database["public"]["Enums"]["grain_type"][] | null;
          preferred_payment_terms: string | null;
          rating: number | null;
          state: string | null;
          status: Database["public"]["Enums"]["buyer_status"] | null;
          tags: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          admin_id: string;
          buyer_type?: Database["public"]["Enums"]["buyer_type"] | null;
          city?: string | null;
          company_name?: string | null;
          contact_designation?: string | null;
          contact_email?: string | null;
          contact_name: string;
          contact_phone?: string | null;
          country?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          last_interaction_at?: string | null;
          last_order_at?: string | null;
          name: string;
          notes?: string | null;
          preferred_grain_types?: Database["public"]["Enums"]["grain_type"][] | null;
          preferred_payment_terms?: string | null;
          rating?: number | null;
          state?: string | null;
          status?: Database["public"]["Enums"]["buyer_status"] | null;
          tags?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          admin_id?: string;
          buyer_type?: Database["public"]["Enums"]["buyer_type"] | null;
          city?: string | null;
          company_name?: string | null;
          contact_designation?: string | null;
          contact_email?: string | null;
          contact_name?: string;
          contact_phone?: string | null;
          country?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          last_interaction_at?: string | null;
          last_order_at?: string | null;
          name?: string;
          notes?: string | null;
          preferred_grain_types?: Database["public"]["Enums"]["grain_type"][] | null;
          preferred_payment_terms?: string | null;
          rating?: number | null;
          state?: string | null;
          status?: Database["public"]["Enums"]["buyer_status"] | null;
          tags?: string[] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "buyers_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buyers_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      carrier_tracking_events: {
        Row: {
          carrier_id: string;
          created_at: string;
          event_code: string | null;
          event_label: string | null;
          external_event_id: string | null;
          id: string;
          mapped_status: string | null;
          occurred_at: string;
          raw_payload: Json | null;
          shipment_id: string;
        };
        Insert: {
          carrier_id: string;
          created_at?: string;
          event_code?: string | null;
          event_label?: string | null;
          external_event_id?: string | null;
          id?: string;
          mapped_status?: string | null;
          occurred_at?: string;
          raw_payload?: Json | null;
          shipment_id: string;
        };
        Update: {
          carrier_id?: string;
          created_at?: string;
          event_code?: string | null;
          event_label?: string | null;
          external_event_id?: string | null;
          id?: string;
          mapped_status?: string | null;
          occurred_at?: string;
          raw_payload?: Json | null;
          shipment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carrier_tracking_events_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "carriers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carrier_tracking_events_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "buyer_shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      carriers: {
        Row: {
          active: boolean;
          code: string;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          event_map: Json;
          id: string;
          logo_url: string | null;
          name: string;
          tracking_url_template: string | null;
          type: string;
          updated_at: string;
          webhook_secret: string | null;
        };
        Insert: {
          active?: boolean;
          code: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          event_map?: Json;
          id?: string;
          logo_url?: string | null;
          name: string;
          tracking_url_template?: string | null;
          type?: string;
          updated_at?: string;
          webhook_secret?: string | null;
        };
        Update: {
          active?: boolean;
          code?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          event_map?: Json;
          id?: string;
          logo_url?: string | null;
          name?: string;
          tracking_url_template?: string | null;
          type?: string;
          updated_at?: string;
          webhook_secret?: string | null;
        };
        Relationships: [];
      };
      customer_feedback: {
        Row: {
          admin_id: string;
          comments: string | null;
          communication_rating: number | null;
          created_at: string;
          follow_up_note: string | null;
          follow_up_required: boolean | null;
          id: string;
          installation_quality: number | null;
          issues_encountered: string[] | null;
          order_id: string;
          overall_rating: number | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          submitted_at: string;
          technician_id: string | null;
          technician_rating: number | null;
          timeliness_rating: number | null;
          updated_at: string;
          warehouse_id: string | null;
          would_recommend: boolean | null;
        };
        Insert: {
          admin_id: string;
          comments?: string | null;
          communication_rating?: number | null;
          created_at?: string;
          follow_up_note?: string | null;
          follow_up_required?: boolean | null;
          id?: string;
          installation_quality?: number | null;
          issues_encountered?: string[] | null;
          order_id: string;
          overall_rating?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          submitted_at?: string;
          technician_id?: string | null;
          technician_rating?: number | null;
          timeliness_rating?: number | null;
          updated_at?: string;
          warehouse_id?: string | null;
          would_recommend?: boolean | null;
        };
        Update: {
          admin_id?: string;
          comments?: string | null;
          communication_rating?: number | null;
          created_at?: string;
          follow_up_note?: string | null;
          follow_up_required?: boolean | null;
          id?: string;
          installation_quality?: number | null;
          issues_encountered?: string[] | null;
          order_id?: string;
          overall_rating?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          submitted_at?: string;
          technician_id?: string | null;
          technician_rating?: number | null;
          timeliness_rating?: number | null;
          updated_at?: string;
          warehouse_id?: string | null;
          would_recommend?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_feedback_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_feedback_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "customer_feedback_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "hardware_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_feedback_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_feedback_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "customer_feedback_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_feedback_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "customer_feedback_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "customer_feedback_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      dashboard_shares: {
        Row: {
          created_at: string;
          date_defaults: Json;
          expires_at: string | null;
          id: string;
          last_viewed_at: string | null;
          owner_user_id: string;
          revoked_at: string | null;
          role_snapshot: string;
          title: string;
          token: string;
          updated_at: string;
          view_count: number;
          widget_ids: string[];
        };
        Insert: {
          created_at?: string;
          date_defaults?: Json;
          expires_at?: string | null;
          id?: string;
          last_viewed_at?: string | null;
          owner_user_id: string;
          revoked_at?: string | null;
          role_snapshot: string;
          title?: string;
          token: string;
          updated_at?: string;
          view_count?: number;
          widget_ids?: string[];
        };
        Update: {
          created_at?: string;
          date_defaults?: Json;
          expires_at?: string | null;
          id?: string;
          last_viewed_at?: string | null;
          owner_user_id?: string;
          revoked_at?: string | null;
          role_snapshot?: string;
          title?: string;
          token?: string;
          updated_at?: string;
          view_count?: number;
          widget_ids?: string[];
        };
        Relationships: [];
      };
      dashboard_widgets: {
        Row: {
          chart_type: string;
          created_at: string;
          dashboard_key: string;
          filters: Json;
          id: string;
          metric_key: string;
          owner_id: string | null;
          position: number;
          role_scope: string;
          size: string;
          updated_at: string;
        };
        Insert: {
          chart_type?: string;
          created_at?: string;
          dashboard_key: string;
          filters?: Json;
          id?: string;
          metric_key: string;
          owner_id?: string | null;
          position?: number;
          role_scope?: string;
          size?: string;
          updated_at?: string;
        };
        Update: {
          chart_type?: string;
          created_at?: string;
          dashboard_key?: string;
          filters?: Json;
          id?: string;
          metric_key?: string;
          owner_id?: string | null;
          position?: number;
          role_scope?: string;
          size?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_metric_key_fkey";
            columns: ["metric_key"];
            isOneToOne: false;
            referencedRelation: "metric_registry";
            referencedColumns: ["key"];
          },
        ];
      };
      device_heartbeats: {
        Row: {
          admin_id: string;
          battery: number | null;
          device_id: string;
          last_seen_at: string;
          rssi: number | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          battery?: number | null;
          device_id: string;
          last_seen_at?: string;
          rssi?: number | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          admin_id?: string;
          battery?: number | null;
          device_id?: string;
          last_seen_at?: string;
          rssi?: number | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dispatches: {
        Row: {
          admin_id: string;
          avg_cost_at_dispatch: number | null;
          buyer_id: string | null;
          created_at: string | null;
          created_by: string;
          destination: string | null;
          dispatch_date: string | null;
          driver_contact: string | null;
          driver_name: string | null;
          id: string;
          notes: string | null;
          price_per_kg: number;
          profit: number | null;
          quantity_kg: number;
          revenue: number | null;
          silo_id: string;
          updated_at: string | null;
          vehicle_number: string | null;
        };
        Insert: {
          admin_id: string;
          avg_cost_at_dispatch?: number | null;
          buyer_id?: string | null;
          created_at?: string | null;
          created_by: string;
          destination?: string | null;
          dispatch_date?: string | null;
          driver_contact?: string | null;
          driver_name?: string | null;
          id?: string;
          notes?: string | null;
          price_per_kg: number;
          profit?: number | null;
          quantity_kg: number;
          revenue?: number | null;
          silo_id: string;
          updated_at?: string | null;
          vehicle_number?: string | null;
        };
        Update: {
          admin_id?: string;
          avg_cost_at_dispatch?: number | null;
          buyer_id?: string | null;
          created_at?: string | null;
          created_by?: string;
          destination?: string | null;
          dispatch_date?: string | null;
          driver_contact?: string | null;
          driver_name?: string | null;
          id?: string;
          notes?: string | null;
          price_per_kg?: number;
          profit?: number | null;
          quantity_kg?: number;
          revenue?: number | null;
          silo_id?: string;
          updated_at?: string | null;
          vehicle_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dispatches_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dispatches_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "dispatches_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "buyers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dispatches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dispatches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "dispatches_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dispatches_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
        ];
      };
      drivers: {
        Row: {
          active: boolean;
          carrier_id: string;
          created_at: string;
          full_name: string;
          id: string;
          license_expiry: string | null;
          license_no: string | null;
          phone: string | null;
          profile_id: string | null;
          rating: number | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          carrier_id: string;
          created_at?: string;
          full_name: string;
          id?: string;
          license_expiry?: string | null;
          license_no?: string | null;
          phone?: string | null;
          profile_id?: string | null;
          rating?: number | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          carrier_id?: string;
          created_at?: string;
          full_name?: string;
          id?: string;
          license_expiry?: string | null;
          license_no?: string | null;
          phone?: string | null;
          profile_id?: string | null;
          rating?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drivers_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "carriers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drivers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drivers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      email_send_log: {
        Row: {
          email_type: string;
          error_message: string | null;
          id: string;
          provider_message_id: string | null;
          recipient_email: string;
          sent_at: string;
          status: string;
          user_id: string | null;
        };
        Insert: {
          email_type: string;
          error_message?: string | null;
          id?: string;
          provider_message_id?: string | null;
          recipient_email: string;
          sent_at?: string;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          email_type?: string;
          error_message?: string | null;
          id?: string;
          provider_message_id?: string | null;
          recipient_email?: string;
          sent_at?: string;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_send_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_send_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      favorite_listings: {
        Row: {
          buyer_account_id: string;
          created_at: string;
          id: string;
          listing_id: string;
        };
        Insert: {
          buyer_account_id: string;
          created_at?: string;
          id?: string;
          listing_id: string;
        };
        Update: {
          buyer_account_id?: string;
          created_at?: string;
          id?: string;
          listing_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorite_listings_buyer_account_id_fkey";
            columns: ["buyer_account_id"];
            isOneToOne: false;
            referencedRelation: "buyer_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorite_listings_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "grain_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorite_listings_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "mobile_marketplace_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorite_listings_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "public_listings_v";
            referencedColumns: ["id"];
          },
        ];
      };
      field_incident_comments: {
        Row: {
          author_name: string;
          author_role: string;
          created_at: string;
          id: string;
          incident_id: string;
          message: string;
          user_id: string;
        };
        Insert: {
          author_name: string;
          author_role?: string;
          created_at?: string;
          id?: string;
          incident_id: string;
          message: string;
          user_id: string;
        };
        Update: {
          author_name?: string;
          author_role?: string;
          created_at?: string;
          id?: string;
          incident_id?: string;
          message?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "field_incident_comments_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "field_incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "field_incident_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "field_incident_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      field_incidents: {
        Row: {
          assigned_at: string | null;
          assigned_to: string | null;
          attachments: Json;
          category: string;
          created_at: string;
          id: string;
          location_lat: number | null;
          location_lng: number | null;
          notes: string | null;
          reporter_user_id: string;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: string;
          silo_id: string | null;
          source: string;
          status: string;
          technician_assigned_at: string | null;
          technician_id: string | null;
          technician_notes: string | null;
          technician_status: string | null;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_to?: string | null;
          attachments?: Json;
          category: string;
          created_at?: string;
          id?: string;
          location_lat?: number | null;
          location_lng?: number | null;
          notes?: string | null;
          reporter_user_id: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string;
          silo_id?: string | null;
          source?: string;
          status?: string;
          technician_assigned_at?: string | null;
          technician_id?: string | null;
          technician_notes?: string | null;
          technician_status?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          assigned_at?: string | null;
          assigned_to?: string | null;
          attachments?: Json;
          category?: string;
          created_at?: string;
          id?: string;
          location_lat?: number | null;
          location_lng?: number | null;
          notes?: string | null;
          reporter_user_id?: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string;
          silo_id?: string | null;
          source?: string;
          status?: string;
          technician_assigned_at?: string | null;
          technician_id?: string | null;
          technician_notes?: string | null;
          technician_status?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "field_incidents_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "field_incidents_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "field_incidents_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "field_incidents_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "field_incidents_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "field_incidents_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      field_tickets: {
        Row: {
          admin_id: string;
          closed_at: string | null;
          closed_by: string | null;
          created_at: string;
          description: string;
          id: string;
          priority: string;
          reporter_name: string;
          reporter_role: string;
          resolved_at: string | null;
          resolved_by: string | null;
          resolved_note: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          priority?: string;
          reporter_name: string;
          reporter_role?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolved_note?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          admin_id?: string;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          priority?: string;
          reporter_name?: string;
          reporter_role?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolved_note?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      finance_ledger_entries: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          direction: string;
          entry_type: string;
          hold_until: string | null;
          id: string;
          metadata: Json;
          occurred_at: string;
          order_id: string | null;
          payout_id: string | null;
          seller_id: string | null;
          status: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency?: string;
          direction: string;
          entry_type: string;
          hold_until?: string | null;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          order_id?: string | null;
          payout_id?: string | null;
          seller_id?: string | null;
          status?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          direction?: string;
          entry_type?: string;
          hold_until?: string | null;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          order_id?: string | null;
          payout_id?: string | null;
          seller_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "finance_ledger_entries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finance_ledger_entries_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finance_ledger_entries_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      grain_alert_comments: {
        Row: {
          author_name: string;
          author_role: string;
          created_at: string;
          id: string;
          incident_id: string;
          message: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          author_name: string;
          author_role: string;
          created_at?: string;
          id?: string;
          incident_id: string;
          message: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          author_name?: string;
          author_role?: string;
          created_at?: string;
          id?: string;
          incident_id?: string;
          message?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grain_alert_comments_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "grain_alerts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alert_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alert_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      grain_alerts: {
        Row: {
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          actions_taken: Json | null;
          actuator_id: string | null;
          admin_id: string;
          ai_context: Json | null;
          ai_recommendation: string | null;
          alert_id: string;
          alert_type: string | null;
          assigned_to: string | null;
          auto_resolve: boolean | null;
          auto_resolve_after: number | null;
          batch_id: string | null;
          created_at: string | null;
          created_by: string | null;
          custom_fields: Json | null;
          deleted_at: string | null;
          device_id: string | null;
          environmental_context: Json | null;
          escalation_history: Json | null;
          escalation_level: number | null;
          id: string;
          message: string;
          notification_sent: boolean | null;
          notifications_sent: Json | null;
          priority: Database["public"]["Enums"]["alert_priority"];
          recipient_id: string | null;
          related_alerts: Json | null;
          resolution: Json | null;
          resolved_at: string | null;
          resolved_by: string | null;
          sensor_type: Database["public"]["Enums"]["sensor_type"] | null;
          silo_id: string | null;
          source: string;
          status: Database["public"]["Enums"]["alert_status"] | null;
          suppress_similar: boolean | null;
          suppression_period: number | null;
          tags: string[] | null;
          title: string;
          trigger_conditions: Json | null;
          triggered_at: string | null;
          updated_at: string | null;
          warehouse_id: string | null;
        };
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          actions_taken?: Json | null;
          actuator_id?: string | null;
          admin_id: string;
          ai_context?: Json | null;
          ai_recommendation?: string | null;
          alert_id: string;
          alert_type?: string | null;
          assigned_to?: string | null;
          auto_resolve?: boolean | null;
          auto_resolve_after?: number | null;
          batch_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          custom_fields?: Json | null;
          deleted_at?: string | null;
          device_id?: string | null;
          environmental_context?: Json | null;
          escalation_history?: Json | null;
          escalation_level?: number | null;
          id?: string;
          message: string;
          notification_sent?: boolean | null;
          notifications_sent?: Json | null;
          priority: Database["public"]["Enums"]["alert_priority"];
          recipient_id?: string | null;
          related_alerts?: Json | null;
          resolution?: Json | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          sensor_type?: Database["public"]["Enums"]["sensor_type"] | null;
          silo_id?: string | null;
          source: string;
          status?: Database["public"]["Enums"]["alert_status"] | null;
          suppress_similar?: boolean | null;
          suppression_period?: number | null;
          tags?: string[] | null;
          title: string;
          trigger_conditions?: Json | null;
          triggered_at?: string | null;
          updated_at?: string | null;
          warehouse_id?: string | null;
        };
        Update: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          actions_taken?: Json | null;
          actuator_id?: string | null;
          admin_id?: string;
          ai_context?: Json | null;
          ai_recommendation?: string | null;
          alert_id?: string;
          alert_type?: string | null;
          assigned_to?: string | null;
          auto_resolve?: boolean | null;
          auto_resolve_after?: number | null;
          batch_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          custom_fields?: Json | null;
          deleted_at?: string | null;
          device_id?: string | null;
          environmental_context?: Json | null;
          escalation_history?: Json | null;
          escalation_level?: number | null;
          id?: string;
          message?: string;
          notification_sent?: boolean | null;
          notifications_sent?: Json | null;
          priority?: Database["public"]["Enums"]["alert_priority"];
          recipient_id?: string | null;
          related_alerts?: Json | null;
          resolution?: Json | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          sensor_type?: Database["public"]["Enums"]["sensor_type"] | null;
          silo_id?: string | null;
          source?: string;
          status?: Database["public"]["Enums"]["alert_status"] | null;
          suppress_similar?: boolean | null;
          suppression_period?: number | null;
          tags?: string[] | null;
          title?: string;
          trigger_conditions?: Json | null;
          triggered_at?: string | null;
          updated_at?: string | null;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "grain_alerts_acknowledged_by_fkey";
            columns: ["acknowledged_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alerts_acknowledged_by_fkey";
            columns: ["acknowledged_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_alerts_actuator_id_fkey";
            columns: ["actuator_id"];
            isOneToOne: false;
            referencedRelation: "actuators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alerts_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alerts_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_alerts_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alerts_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_alerts_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alerts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alerts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_alerts_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "sensor_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alerts_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alerts_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_alerts_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alerts_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_alerts_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alerts_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_alerts_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "grain_alerts_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      grain_batch_events: {
        Row: {
          actor_user_id: string | null;
          admin_id: string | null;
          batch_id: string;
          created_at: string;
          from_state: string | null;
          id: string;
          note: string | null;
          snapshot: Json | null;
          to_state: string;
        };
        Insert: {
          actor_user_id?: string | null;
          admin_id?: string | null;
          batch_id: string;
          created_at?: string;
          from_state?: string | null;
          id?: string;
          note?: string | null;
          snapshot?: Json | null;
          to_state: string;
        };
        Update: {
          actor_user_id?: string | null;
          admin_id?: string | null;
          batch_id?: string;
          created_at?: string;
          from_state?: string | null;
          id?: string;
          note?: string | null;
          snapshot?: Json | null;
          to_state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grain_batch_events_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      grain_batches: {
        Row: {
          actual_dispatch_date: string | null;
          admin_id: string;
          ai_prediction_confidence: number | null;
          assigned_technician_id: string | null;
          batch_id: string;
          buyer_id: string | null;
          created_at: string | null;
          created_by: string;
          currency: string | null;
          deleted_at: string | null;
          dispatch_details: Json | null;
          dispatched_quantity_kg: number | null;
          expected_dispatch_date: string | null;
          farmer_contact: string | null;
          farmer_name: string | null;
          grade: string | null;
          grain_type: Database["public"]["Enums"]["grain_type"];
          harvest_date: string | null;
          id: string;
          insurance_policy_number: string | null;
          insurance_value: number | null;
          insured: boolean | null;
          intake_conditions: Json | null;
          intake_date: string | null;
          intake_source: string | null;
          last_risk_assessment: string | null;
          moisture_content: number | null;
          net_weight_kg: number | null;
          notes: string | null;
          origin_coordinates: Json | null;
          profit: number | null;
          protein_content: number | null;
          purchase_price_per_kg: number | null;
          qc_assigned_to: string | null;
          qc_completed_at: string | null;
          qc_completed_by: string | null;
          qc_notes: string | null;
          qc_status: string;
          qr_code: string | null;
          quality_snapshot: Json | null;
          quality_tests: Json | null;
          quantity_kg: number;
          remaining_kg: number | null;
          revenue: number | null;
          risk_score: number | null;
          sell_price_per_kg: number | null;
          sensor_summary: Json | null;
          silo_id: string;
          source_kind: Database["public"]["Enums"]["supplier_kind"] | null;
          source_location: string | null;
          spoilage_events: Json | null;
          spoilage_label: Database["public"]["Enums"]["spoilage_label"] | null;
          state_changed_at: string | null;
          status: Database["public"]["Enums"]["batch_status"] | null;
          supplier_contact: string | null;
          supplier_id: string | null;
          supplier_name: string | null;
          tags: string[] | null;
          technician_assigned_at: string | null;
          technician_id: string | null;
          technician_notes: string | null;
          technician_status: string | null;
          test_weight: number | null;
          total_purchase_value: number | null;
          unit_cost: number | null;
          updated_at: string | null;
          updated_by: string | null;
          variety: string | null;
          warehouse_id: string;
        };
        Insert: {
          actual_dispatch_date?: string | null;
          admin_id: string;
          ai_prediction_confidence?: number | null;
          assigned_technician_id?: string | null;
          batch_id: string;
          buyer_id?: string | null;
          created_at?: string | null;
          created_by: string;
          currency?: string | null;
          deleted_at?: string | null;
          dispatch_details?: Json | null;
          dispatched_quantity_kg?: number | null;
          expected_dispatch_date?: string | null;
          farmer_contact?: string | null;
          farmer_name?: string | null;
          grade?: string | null;
          grain_type: Database["public"]["Enums"]["grain_type"];
          harvest_date?: string | null;
          id?: string;
          insurance_policy_number?: string | null;
          insurance_value?: number | null;
          insured?: boolean | null;
          intake_conditions?: Json | null;
          intake_date?: string | null;
          intake_source?: string | null;
          last_risk_assessment?: string | null;
          moisture_content?: number | null;
          net_weight_kg?: number | null;
          notes?: string | null;
          origin_coordinates?: Json | null;
          profit?: number | null;
          protein_content?: number | null;
          purchase_price_per_kg?: number | null;
          qc_assigned_to?: string | null;
          qc_completed_at?: string | null;
          qc_completed_by?: string | null;
          qc_notes?: string | null;
          qc_status?: string;
          qr_code?: string | null;
          quality_snapshot?: Json | null;
          quality_tests?: Json | null;
          quantity_kg: number;
          remaining_kg?: number | null;
          revenue?: number | null;
          risk_score?: number | null;
          sell_price_per_kg?: number | null;
          sensor_summary?: Json | null;
          silo_id: string;
          source_kind?: Database["public"]["Enums"]["supplier_kind"] | null;
          source_location?: string | null;
          spoilage_events?: Json | null;
          spoilage_label?: Database["public"]["Enums"]["spoilage_label"] | null;
          state_changed_at?: string | null;
          status?: Database["public"]["Enums"]["batch_status"] | null;
          supplier_contact?: string | null;
          supplier_id?: string | null;
          supplier_name?: string | null;
          tags?: string[] | null;
          technician_assigned_at?: string | null;
          technician_id?: string | null;
          technician_notes?: string | null;
          technician_status?: string | null;
          test_weight?: number | null;
          total_purchase_value?: number | null;
          unit_cost?: number | null;
          updated_at?: string | null;
          updated_by?: string | null;
          variety?: string | null;
          warehouse_id: string;
        };
        Update: {
          actual_dispatch_date?: string | null;
          admin_id?: string;
          ai_prediction_confidence?: number | null;
          assigned_technician_id?: string | null;
          batch_id?: string;
          buyer_id?: string | null;
          created_at?: string | null;
          created_by?: string;
          currency?: string | null;
          deleted_at?: string | null;
          dispatch_details?: Json | null;
          dispatched_quantity_kg?: number | null;
          expected_dispatch_date?: string | null;
          farmer_contact?: string | null;
          farmer_name?: string | null;
          grade?: string | null;
          grain_type?: Database["public"]["Enums"]["grain_type"];
          harvest_date?: string | null;
          id?: string;
          insurance_policy_number?: string | null;
          insurance_value?: number | null;
          insured?: boolean | null;
          intake_conditions?: Json | null;
          intake_date?: string | null;
          intake_source?: string | null;
          last_risk_assessment?: string | null;
          moisture_content?: number | null;
          net_weight_kg?: number | null;
          notes?: string | null;
          origin_coordinates?: Json | null;
          profit?: number | null;
          protein_content?: number | null;
          purchase_price_per_kg?: number | null;
          qc_assigned_to?: string | null;
          qc_completed_at?: string | null;
          qc_completed_by?: string | null;
          qc_notes?: string | null;
          qc_status?: string;
          qr_code?: string | null;
          quality_snapshot?: Json | null;
          quality_tests?: Json | null;
          quantity_kg?: number;
          remaining_kg?: number | null;
          revenue?: number | null;
          risk_score?: number | null;
          sell_price_per_kg?: number | null;
          sensor_summary?: Json | null;
          silo_id?: string;
          source_kind?: Database["public"]["Enums"]["supplier_kind"] | null;
          source_location?: string | null;
          spoilage_events?: Json | null;
          spoilage_label?: Database["public"]["Enums"]["spoilage_label"] | null;
          state_changed_at?: string | null;
          status?: Database["public"]["Enums"]["batch_status"] | null;
          supplier_contact?: string | null;
          supplier_id?: string | null;
          supplier_name?: string | null;
          tags?: string[] | null;
          technician_assigned_at?: string | null;
          technician_id?: string | null;
          technician_notes?: string | null;
          technician_status?: string | null;
          test_weight?: number | null;
          total_purchase_value?: number | null;
          unit_cost?: number | null;
          updated_at?: string | null;
          updated_by?: string | null;
          variety?: string | null;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_grain_batches_buyer";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "buyers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_batches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_batches_qc_assigned_to_fkey";
            columns: ["qc_assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_qc_assigned_to_fkey";
            columns: ["qc_assigned_to"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_batches_qc_completed_by_fkey";
            columns: ["qc_completed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_qc_completed_by_fkey";
            columns: ["qc_completed_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_batches_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_batches_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_batches_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "grain_batches_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      grain_dispatch_allocations: {
        Row: {
          batch_id: string;
          created_at: string;
          dispatch_id: string;
          id: string;
          qty_kg: number;
          unit_cost: number | null;
        };
        Insert: {
          batch_id: string;
          created_at?: string;
          dispatch_id: string;
          id?: string;
          qty_kg: number;
          unit_cost?: number | null;
        };
        Update: {
          batch_id?: string;
          created_at?: string;
          dispatch_id?: string;
          id?: string;
          qty_kg?: number;
          unit_cost?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "grain_dispatch_allocations_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_dispatch_allocations_dispatch_id_fkey";
            columns: ["dispatch_id"];
            isOneToOne: false;
            referencedRelation: "grain_dispatches";
            referencedColumns: ["id"];
          },
        ];
      };
      grain_dispatches: {
        Row: {
          admin_id: string;
          avg_cost_snapshot: number | null;
          avg_unit_cost: number | null;
          buyer_confirmed_at: string | null;
          buyer_confirmed_by: string | null;
          buyer_id: string | null;
          buyer_order_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          destination: string | null;
          dispatch_number: string;
          dispatch_photo_url: string | null;
          dispatched_at: string | null;
          driver_cnic: string | null;
          driver_contact: string | null;
          driver_name: string | null;
          expected_date: string | null;
          grain_type: string;
          id: string;
          market_price_snapshot: number | null;
          notes: string | null;
          price_basis: string | null;
          price_per_kg: number;
          profit: number | null;
          silo_id: string;
          stage: string;
          status: string;
          total_amount: number;
          total_cost: number | null;
          total_qty_kg: number;
          updated_at: string;
          vehicle_number: string | null;
          warehouse_id: string | null;
        };
        Insert: {
          admin_id: string;
          avg_cost_snapshot?: number | null;
          avg_unit_cost?: number | null;
          buyer_confirmed_at?: string | null;
          buyer_confirmed_by?: string | null;
          buyer_id?: string | null;
          buyer_order_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          destination?: string | null;
          dispatch_number: string;
          dispatch_photo_url?: string | null;
          dispatched_at?: string | null;
          driver_cnic?: string | null;
          driver_contact?: string | null;
          driver_name?: string | null;
          expected_date?: string | null;
          grain_type: string;
          id?: string;
          market_price_snapshot?: number | null;
          notes?: string | null;
          price_basis?: string | null;
          price_per_kg: number;
          profit?: number | null;
          silo_id: string;
          stage?: string;
          status?: string;
          total_amount?: number;
          total_cost?: number | null;
          total_qty_kg: number;
          updated_at?: string;
          vehicle_number?: string | null;
          warehouse_id?: string | null;
        };
        Update: {
          admin_id?: string;
          avg_cost_snapshot?: number | null;
          avg_unit_cost?: number | null;
          buyer_confirmed_at?: string | null;
          buyer_confirmed_by?: string | null;
          buyer_id?: string | null;
          buyer_order_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          destination?: string | null;
          dispatch_number?: string;
          dispatch_photo_url?: string | null;
          dispatched_at?: string | null;
          driver_cnic?: string | null;
          driver_contact?: string | null;
          driver_name?: string | null;
          expected_date?: string | null;
          grain_type?: string;
          id?: string;
          market_price_snapshot?: number | null;
          notes?: string | null;
          price_basis?: string | null;
          price_per_kg?: number;
          profit?: number | null;
          silo_id?: string;
          stage?: string;
          status?: string;
          total_amount?: number;
          total_cost?: number | null;
          total_qty_kg?: number;
          updated_at?: string;
          vehicle_number?: string | null;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "grain_dispatches_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "buyers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_dispatches_buyer_order_id_fkey";
            columns: ["buyer_order_id"];
            isOneToOne: false;
            referencedRelation: "buyer_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_dispatches_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_dispatches_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_dispatches_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "grain_dispatches_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      grain_listings: {
        Row: {
          admin_id: string;
          available_from: string | null;
          available_kg: number;
          batch_id: string;
          certificate_id: string | null;
          cover_image_url: string | null;
          created_at: string;
          created_by: string;
          currency: string;
          description: string | null;
          expires_at: string | null;
          id: string;
          min_order_kg: number;
          price_per_kg: number;
          slug: string | null;
          status: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["listing_visibility"];
        };
        Insert: {
          admin_id: string;
          available_from?: string | null;
          available_kg: number;
          batch_id: string;
          certificate_id?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          created_by: string;
          currency?: string;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          min_order_kg?: number;
          price_per_kg: number;
          slug?: string | null;
          status?: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["listing_visibility"];
        };
        Update: {
          admin_id?: string;
          available_from?: string | null;
          available_kg?: number;
          batch_id?: string;
          certificate_id?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          created_by?: string;
          currency?: string;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          min_order_kg?: number;
          price_per_kg?: number;
          slug?: string | null;
          status?: Database["public"]["Enums"]["listing_status"];
          title?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["listing_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "grain_listings_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: true;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_listings_certificate_id_fkey";
            columns: ["certificate_id"];
            isOneToOne: false;
            referencedRelation: "batch_quality_certificates";
            referencedColumns: ["id"];
          },
        ];
      };
      hardware_order_devices: {
        Row: {
          commissioned_at: string | null;
          created_at: string;
          id: string;
          model: string | null;
          order_id: string;
          sensor_device_id: string | null;
          serial: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          commissioned_at?: string | null;
          created_at?: string;
          id?: string;
          model?: string | null;
          order_id: string;
          sensor_device_id?: string | null;
          serial: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          commissioned_at?: string | null;
          created_at?: string;
          id?: string;
          model?: string | null;
          order_id?: string;
          sensor_device_id?: string | null;
          serial?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hardware_order_devices_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "hardware_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hardware_order_devices_sensor_device_id_fkey";
            columns: ["sensor_device_id"];
            isOneToOne: false;
            referencedRelation: "sensor_devices";
            referencedColumns: ["id"];
          },
        ];
      };
      hardware_order_installations: {
        Row: {
          admin_signed_off_at: string | null;
          admin_signed_off_by: string | null;
          admin_signoff_note: string | null;
          assigned_at: string | null;
          blocker_note: string | null;
          city: string | null;
          completed_at: string | null;
          created_at: string;
          destination_address: string | null;
          destination_lat: number | null;
          destination_lng: number | null;
          en_route_at: string | null;
          id: string;
          installed_at: string | null;
          installer_company: string | null;
          installer_name: string | null;
          installer_phone: string | null;
          installer_photo_url: string | null;
          onsite_at: string | null;
          order_id: string;
          origin_address: string | null;
          origin_lat: number | null;
          origin_lng: number | null;
          scheduled_for: string | null;
          scheduled_visit_at: string | null;
          silo_id: string | null;
          status: string;
          technician_id: string | null;
          updated_at: string;
          warehouse_id: string | null;
        };
        Insert: {
          admin_signed_off_at?: string | null;
          admin_signed_off_by?: string | null;
          admin_signoff_note?: string | null;
          assigned_at?: string | null;
          blocker_note?: string | null;
          city?: string | null;
          completed_at?: string | null;
          created_at?: string;
          destination_address?: string | null;
          destination_lat?: number | null;
          destination_lng?: number | null;
          en_route_at?: string | null;
          id?: string;
          installed_at?: string | null;
          installer_company?: string | null;
          installer_name?: string | null;
          installer_phone?: string | null;
          installer_photo_url?: string | null;
          onsite_at?: string | null;
          order_id: string;
          origin_address?: string | null;
          origin_lat?: number | null;
          origin_lng?: number | null;
          scheduled_for?: string | null;
          scheduled_visit_at?: string | null;
          silo_id?: string | null;
          status?: string;
          technician_id?: string | null;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Update: {
          admin_signed_off_at?: string | null;
          admin_signed_off_by?: string | null;
          admin_signoff_note?: string | null;
          assigned_at?: string | null;
          blocker_note?: string | null;
          city?: string | null;
          completed_at?: string | null;
          created_at?: string;
          destination_address?: string | null;
          destination_lat?: number | null;
          destination_lng?: number | null;
          en_route_at?: string | null;
          id?: string;
          installed_at?: string | null;
          installer_company?: string | null;
          installer_name?: string | null;
          installer_phone?: string | null;
          installer_photo_url?: string | null;
          onsite_at?: string | null;
          order_id?: string;
          origin_address?: string | null;
          origin_lat?: number | null;
          origin_lng?: number | null;
          scheduled_for?: string | null;
          scheduled_visit_at?: string | null;
          silo_id?: string | null;
          status?: string;
          technician_id?: string | null;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hardware_order_installations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "hardware_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hardware_order_installations_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hardware_order_installations_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hardware_order_installations_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hardware_order_installations_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "hardware_order_installations_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "hardware_order_installations_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      hardware_order_messages: {
        Row: {
          created_at: string;
          emailed: boolean;
          id: string;
          message: string;
          order_id: string;
          sender_id: string;
        };
        Insert: {
          created_at?: string;
          emailed?: boolean;
          id?: string;
          message: string;
          order_id: string;
          sender_id: string;
        };
        Update: {
          created_at?: string;
          emailed?: boolean;
          id?: string;
          message?: string;
          order_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hardware_order_messages_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "hardware_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      hardware_order_status_history: {
        Row: {
          actor_id: string | null;
          actor_role: string | null;
          created_at: string;
          from_status: string | null;
          id: string;
          note: string | null;
          order_id: string;
          to_status: string;
        };
        Insert: {
          actor_id?: string | null;
          actor_role?: string | null;
          created_at?: string;
          from_status?: string | null;
          id?: string;
          note?: string | null;
          order_id: string;
          to_status: string;
        };
        Update: {
          actor_id?: string | null;
          actor_role?: string | null;
          created_at?: string;
          from_status?: string | null;
          id?: string;
          note?: string | null;
          order_id?: string;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hardware_order_status_history_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hardware_order_status_history_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "hardware_order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "hardware_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      hardware_order_visit_events: {
        Row: {
          created_at: string;
          created_by: string | null;
          event_at: string;
          event_type: string | null;
          id: string;
          location: Json | null;
          note: string;
          order_id: string;
          photo_url: string | null;
          photo_urls: string[] | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          event_at?: string;
          event_type?: string | null;
          id?: string;
          location?: Json | null;
          note: string;
          order_id: string;
          photo_url?: string | null;
          photo_urls?: string[] | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          event_at?: string;
          event_type?: string | null;
          id?: string;
          location?: Json | null;
          note?: string;
          order_id?: string;
          photo_url?: string | null;
          photo_urls?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "hardware_order_visit_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "hardware_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      hardware_orders: {
        Row: {
          admin_id: string | null;
          assigned_technician_id: string | null;
          business_name: string | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_reason: string | null;
          confirmation_email_sent_at: string | null;
          contact_phone: string | null;
          created_at: string;
          currency: string;
          customer_email: string | null;
          customer_name: string | null;
          expected_arrival_at: string | null;
          hardware_quantity: number;
          hardware_total: number;
          hardware_unit_cost: number;
          hardware_unit_price: number;
          id: string;
          install_address: string | null;
          install_city: string | null;
          install_country: string | null;
          install_lat: number | null;
          install_lng: number | null;
          installed_at: string | null;
          notes: string | null;
          plan_id: string | null;
          plan_name: string | null;
          preferred_install_date: string | null;
          refunded: boolean;
          scheduled_install_date: string | null;
          shipped_at: string | null;
          status: string;
          stripe_customer_id: string | null;
          stripe_payment_intent: string | null;
          stripe_session_id: string | null;
          stripe_subscription_id: string | null;
          tax_id: string | null;
          technician_name: string | null;
          technician_phone: string | null;
          tracking_carrier: string | null;
          tracking_number: string | null;
          updated_at: string;
          warehouse_city: string | null;
          warehouse_id: string | null;
          warehouse_location: string | null;
        };
        Insert: {
          admin_id?: string | null;
          assigned_technician_id?: string | null;
          business_name?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_reason?: string | null;
          confirmation_email_sent_at?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          currency?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          expected_arrival_at?: string | null;
          hardware_quantity?: number;
          hardware_total?: number;
          hardware_unit_cost?: number;
          hardware_unit_price?: number;
          id?: string;
          install_address?: string | null;
          install_city?: string | null;
          install_country?: string | null;
          install_lat?: number | null;
          install_lng?: number | null;
          installed_at?: string | null;
          notes?: string | null;
          plan_id?: string | null;
          plan_name?: string | null;
          preferred_install_date?: string | null;
          refunded?: boolean;
          scheduled_install_date?: string | null;
          shipped_at?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_payment_intent?: string | null;
          stripe_session_id?: string | null;
          stripe_subscription_id?: string | null;
          tax_id?: string | null;
          technician_name?: string | null;
          technician_phone?: string | null;
          tracking_carrier?: string | null;
          tracking_number?: string | null;
          updated_at?: string;
          warehouse_city?: string | null;
          warehouse_id?: string | null;
          warehouse_location?: string | null;
        };
        Update: {
          admin_id?: string | null;
          assigned_technician_id?: string | null;
          business_name?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_reason?: string | null;
          confirmation_email_sent_at?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          currency?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          expected_arrival_at?: string | null;
          hardware_quantity?: number;
          hardware_total?: number;
          hardware_unit_cost?: number;
          hardware_unit_price?: number;
          id?: string;
          install_address?: string | null;
          install_city?: string | null;
          install_country?: string | null;
          install_lat?: number | null;
          install_lng?: number | null;
          installed_at?: string | null;
          notes?: string | null;
          plan_id?: string | null;
          plan_name?: string | null;
          preferred_install_date?: string | null;
          refunded?: boolean;
          scheduled_install_date?: string | null;
          shipped_at?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_payment_intent?: string | null;
          stripe_session_id?: string | null;
          stripe_subscription_id?: string | null;
          tax_id?: string | null;
          technician_name?: string | null;
          technician_phone?: string | null;
          tracking_carrier?: string | null;
          tracking_number?: string | null;
          updated_at?: string;
          warehouse_city?: string | null;
          warehouse_id?: string | null;
          warehouse_location?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hardware_orders_assigned_technician_id_fkey";
            columns: ["assigned_technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hardware_orders_assigned_technician_id_fkey";
            columns: ["assigned_technician_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "hardware_orders_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "hardware_orders_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      hubspot_sync_log: {
        Row: {
          action: string;
          created_at: string;
          error_message: string | null;
          hubspot_object_id: string | null;
          hubspot_object_type: string;
          id: string;
          payload: Json | null;
          status: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          error_message?: string | null;
          hubspot_object_id?: string | null;
          hubspot_object_type: string;
          id?: string;
          payload?: Json | null;
          status: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          error_message?: string | null;
          hubspot_object_id?: string | null;
          hubspot_object_type?: string;
          id?: string;
          payload?: Json | null;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hubspot_sync_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hubspot_sync_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      inspection_reports: {
        Row: {
          batch_id: string | null;
          created_at: string;
          defects: string | null;
          id: string;
          image_urls: Json | null;
          moisture: string | null;
          quality: string | null;
          remarks: string | null;
          status: string;
          technician_id: string | null;
          updated_at: string;
        };
        Insert: {
          batch_id?: string | null;
          created_at?: string;
          defects?: string | null;
          id?: string;
          image_urls?: Json | null;
          moisture?: string | null;
          quality?: string | null;
          remarks?: string | null;
          status?: string;
          technician_id?: string | null;
          updated_at?: string;
        };
        Update: {
          batch_id?: string | null;
          created_at?: string;
          defects?: string | null;
          id?: string;
          image_urls?: Json | null;
          moisture?: string | null;
          quality?: string | null;
          remarks?: string | null;
          status?: string;
          technician_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspection_reports_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspection_reports_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspection_reports_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      insurance_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string | null;
          admin_id: string | null;
          carrier_id: string | null;
          claim_id: string | null;
          created_at: string;
          id: string;
          payload: Json;
          policy_id: string | null;
          source: string;
          subject_id: string | null;
          subject_type: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: string | null;
          admin_id?: string | null;
          carrier_id?: string | null;
          claim_id?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
          policy_id?: string | null;
          source?: string;
          subject_id?: string | null;
          subject_type?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          admin_id?: string | null;
          carrier_id?: string | null;
          claim_id?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
          policy_id?: string | null;
          source?: string;
          subject_id?: string | null;
          subject_type?: string | null;
        };
        Relationships: [];
      };
      insurance_carriers: {
        Row: {
          active: boolean;
          api_mode: string;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          notes: string | null;
          updated_at: string;
          webhook_secret: string | null;
          webhook_url: string | null;
        };
        Insert: {
          active?: boolean;
          api_mode?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          notes?: string | null;
          updated_at?: string;
          webhook_secret?: string | null;
          webhook_url?: string | null;
        };
        Update: {
          active?: boolean;
          api_mode?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          notes?: string | null;
          updated_at?: string;
          webhook_secret?: string | null;
          webhook_url?: string | null;
        };
        Relationships: [];
      };
      insurance_claim_attachments: {
        Row: {
          claim_id: string;
          created_at: string;
          file_path: string;
          id: string;
          mime: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
        };
        Insert: {
          claim_id: string;
          created_at?: string;
          file_path: string;
          id?: string;
          mime?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
        };
        Update: {
          claim_id?: string;
          created_at?: string;
          file_path?: string;
          id?: string;
          mime?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "insurance_claim_attachments_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "insurance_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "insurance_claim_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "insurance_claim_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      insurance_claim_events: {
        Row: {
          actor_id: string | null;
          claim_id: string;
          created_at: string;
          event_type: string;
          id: string;
          payload: Json;
        };
        Insert: {
          actor_id?: string | null;
          claim_id: string;
          created_at?: string;
          event_type: string;
          id?: string;
          payload?: Json;
        };
        Update: {
          actor_id?: string | null;
          claim_id?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "insurance_claim_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "insurance_claim_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "insurance_claim_events_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "insurance_claims";
            referencedColumns: ["id"];
          },
        ];
      };
      insurance_claims: {
        Row: {
          admin_id: string;
          amount_approved: number;
          amount_claimed: number;
          approved_date: string | null;
          batch_affected: Json;
          claim_number: string;
          claim_type: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          decided_at: string | null;
          decision_reason: string | null;
          description: string | null;
          external_ref: string | null;
          filed_date: string | null;
          id: string;
          incident_date: string | null;
          narrative: string | null;
          notes: string | null;
          paid_at: string | null;
          photos: Json;
          policy_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          amount_approved?: number;
          amount_claimed?: number;
          approved_date?: string | null;
          batch_affected?: Json;
          claim_number: string;
          claim_type?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          description?: string | null;
          external_ref?: string | null;
          filed_date?: string | null;
          id?: string;
          incident_date?: string | null;
          narrative?: string | null;
          notes?: string | null;
          paid_at?: string | null;
          photos?: Json;
          policy_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          admin_id?: string;
          amount_approved?: number;
          amount_claimed?: number;
          approved_date?: string | null;
          batch_affected?: Json;
          claim_number?: string;
          claim_type?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          description?: string | null;
          external_ref?: string | null;
          filed_date?: string | null;
          id?: string;
          incident_date?: string | null;
          narrative?: string | null;
          notes?: string | null;
          paid_at?: string | null;
          photos?: Json;
          policy_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insurance_claims_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "insurance_policies";
            referencedColumns: ["id"];
          },
        ];
      };
      insurance_policies: {
        Row: {
          admin_id: string;
          commission_rate: number;
          coverage_amount: number;
          coverage_type: string;
          covered_batches: Json;
          created_at: string;
          created_by: string | null;
          currency: string;
          deductible: number;
          end_date: string | null;
          external_ref: string | null;
          id: string;
          metadata: Json;
          notes: string | null;
          policy_number: string;
          premium_amount: number;
          product_id: string | null;
          provider_name: string;
          renewal_date: string | null;
          risk_factors: Json;
          start_date: string | null;
          status: string;
          subject_id: string | null;
          subject_type: string | null;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          commission_rate?: number;
          coverage_amount?: number;
          coverage_type?: string;
          covered_batches?: Json;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          deductible?: number;
          end_date?: string | null;
          external_ref?: string | null;
          id?: string;
          metadata?: Json;
          notes?: string | null;
          policy_number: string;
          premium_amount?: number;
          product_id?: string | null;
          provider_name: string;
          renewal_date?: string | null;
          risk_factors?: Json;
          start_date?: string | null;
          status?: string;
          subject_id?: string | null;
          subject_type?: string | null;
          updated_at?: string;
        };
        Update: {
          admin_id?: string;
          commission_rate?: number;
          coverage_amount?: number;
          coverage_type?: string;
          covered_batches?: Json;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          deductible?: number;
          end_date?: string | null;
          external_ref?: string | null;
          id?: string;
          metadata?: Json;
          notes?: string | null;
          policy_number?: string;
          premium_amount?: number;
          product_id?: string | null;
          provider_name?: string;
          renewal_date?: string | null;
          risk_factors?: Json;
          start_date?: string | null;
          status?: string;
          subject_id?: string | null;
          subject_type?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insurance_policies_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "insurance_products";
            referencedColumns: ["id"];
          },
        ];
      };
      insurance_policy_documents: {
        Row: {
          admin_id: string | null;
          carrier_id: string | null;
          created_at: string;
          document_type: string;
          filename: string;
          id: string;
          is_current: boolean;
          mime: string | null;
          notes: string | null;
          policy_id: string;
          size_bytes: number | null;
          storage_path: string;
          updated_at: string;
          uploaded_by: string | null;
          version: number;
        };
        Insert: {
          admin_id?: string | null;
          carrier_id?: string | null;
          created_at?: string;
          document_type?: string;
          filename: string;
          id?: string;
          is_current?: boolean;
          mime?: string | null;
          notes?: string | null;
          policy_id: string;
          size_bytes?: number | null;
          storage_path: string;
          updated_at?: string;
          uploaded_by?: string | null;
          version?: number;
        };
        Update: {
          admin_id?: string | null;
          carrier_id?: string | null;
          created_at?: string;
          document_type?: string;
          filename?: string;
          id?: string;
          is_current?: boolean;
          mime?: string | null;
          notes?: string | null;
          policy_id?: string;
          size_bytes?: number | null;
          storage_path?: string;
          updated_at?: string;
          uploaded_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "insurance_policy_documents_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "insurance_carriers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "insurance_policy_documents_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "insurance_policies";
            referencedColumns: ["id"];
          },
        ];
      };
      insurance_products: {
        Row: {
          active: boolean;
          base_premium_bps: number;
          carrier_id: string;
          code: string;
          coverage_type: string;
          created_at: string;
          currency: string;
          deductible_bps: number;
          description: string | null;
          id: string;
          max_payout_cents: number | null;
          name: string;
          terms_url: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          base_premium_bps?: number;
          carrier_id: string;
          code: string;
          coverage_type: string;
          created_at?: string;
          currency?: string;
          deductible_bps?: number;
          description?: string | null;
          id?: string;
          max_payout_cents?: number | null;
          name: string;
          terms_url?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          base_premium_bps?: number;
          carrier_id?: string;
          code?: string;
          coverage_type?: string;
          created_at?: string;
          currency?: string;
          deductible_bps?: number;
          description?: string | null;
          id?: string;
          max_payout_cents?: number | null;
          name?: string;
          terms_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insurance_products_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "insurance_carriers";
            referencedColumns: ["id"];
          },
        ];
      };
      insurance_webhook_events: {
        Row: {
          carrier_code: string | null;
          carrier_id: string | null;
          claim_id: string | null;
          created_at: string;
          error_message: string | null;
          event_type: string;
          external_id: string | null;
          headers: Json | null;
          id: string;
          last_replay_at: string | null;
          next_replay_allowed_at: string | null;
          policy_id: string | null;
          processed_at: string | null;
          raw: Json;
          replay_count: number;
          replay_history: Json;
          status: string;
        };
        Insert: {
          carrier_code?: string | null;
          carrier_id?: string | null;
          claim_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          event_type: string;
          external_id?: string | null;
          headers?: Json | null;
          id?: string;
          last_replay_at?: string | null;
          next_replay_allowed_at?: string | null;
          policy_id?: string | null;
          processed_at?: string | null;
          raw: Json;
          replay_count?: number;
          replay_history?: Json;
          status?: string;
        };
        Update: {
          carrier_code?: string | null;
          carrier_id?: string | null;
          claim_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          event_type?: string;
          external_id?: string | null;
          headers?: Json | null;
          id?: string;
          last_replay_at?: string | null;
          next_replay_allowed_at?: string | null;
          policy_id?: string | null;
          processed_at?: string | null;
          raw?: Json;
          replay_count?: number;
          replay_history?: Json;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insurance_webhook_events_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "insurance_carriers";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          admin_id: string;
          amount: number;
          billing_date: string | null;
          created_at: string | null;
          currency: string | null;
          due_date: string | null;
          id: string;
          invoice_number: string | null;
          paid_at: string | null;
          status: Database["public"]["Enums"]["payment_status"] | null;
          stripe_invoice_id: string | null;
          subscription_id: string;
          updated_at: string | null;
        };
        Insert: {
          admin_id: string;
          amount?: number;
          billing_date?: string | null;
          created_at?: string | null;
          currency?: string | null;
          due_date?: string | null;
          id?: string;
          invoice_number?: string | null;
          paid_at?: string | null;
          status?: Database["public"]["Enums"]["payment_status"] | null;
          stripe_invoice_id?: string | null;
          subscription_id: string;
          updated_at?: string | null;
        };
        Update: {
          admin_id?: string;
          amount?: number;
          billing_date?: string | null;
          created_at?: string | null;
          currency?: string | null;
          due_date?: string | null;
          id?: string;
          invoice_number?: string | null;
          paid_at?: string | null;
          status?: Database["public"]["Enums"]["payment_status"] | null;
          stripe_invoice_id?: string | null;
          subscription_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      live_sensor_readings: {
        Row: {
          airflow: number | null;
          ambient_light: number | null;
          confidence: number | null;
          created_at: string | null;
          dew_point: number | null;
          grain_moisture: number;
          grain_type: string;
          humidity: number;
          id: number;
          pest_presence: number | null;
          prediction: string | null;
          rainfall: number | null;
          risk_score: number | null;
          silo_id: string | null;
          source: string | null;
          storage_days: number;
          temperature: number;
          tvoc_ppb: number | null;
        };
        Insert: {
          airflow?: number | null;
          ambient_light?: number | null;
          confidence?: number | null;
          created_at?: string | null;
          dew_point?: number | null;
          grain_moisture: number;
          grain_type: string;
          humidity: number;
          id?: number;
          pest_presence?: number | null;
          prediction?: string | null;
          rainfall?: number | null;
          risk_score?: number | null;
          silo_id?: string | null;
          source?: string | null;
          storage_days?: number;
          temperature: number;
          tvoc_ppb?: number | null;
        };
        Update: {
          airflow?: number | null;
          ambient_light?: number | null;
          confidence?: number | null;
          created_at?: string | null;
          dew_point?: number | null;
          grain_moisture?: number;
          grain_type?: string;
          humidity?: number;
          id?: number;
          pest_presence?: number | null;
          prediction?: string | null;
          rainfall?: number | null;
          risk_score?: number | null;
          silo_id?: string | null;
          source?: string | null;
          storage_days?: number;
          temperature?: number;
          tvoc_ppb?: number | null;
        };
        Relationships: [];
      };
      logistics_cost_entries: {
        Row: {
          amount: number;
          assignment_id: string;
          category: string;
          created_at: string;
          currency: string;
          id: string;
          incurred_at: string;
          notes: string | null;
          receipt_url: string | null;
          recorded_by: string | null;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          assignment_id: string;
          category: string;
          created_at?: string;
          currency?: string;
          id?: string;
          incurred_at?: string;
          notes?: string | null;
          receipt_url?: string | null;
          recorded_by?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          assignment_id?: string;
          category?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          incurred_at?: string;
          notes?: string | null;
          receipt_url?: string | null;
          recorded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "logistics_cost_entries_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "shipment_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "logistics_cost_entries_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "logistics_cost_entries_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      maintenance_requests: {
        Row: {
          admin_id: string;
          assigned_technician_id: string | null;
          created_at: string;
          description: string | null;
          device_id: string | null;
          id: string;
          priority: string;
          requested_by: string;
          resolution_notes: string | null;
          resolved_at: string | null;
          silo_id: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          admin_id: string;
          assigned_technician_id?: string | null;
          created_at?: string;
          description?: string | null;
          device_id?: string | null;
          id?: string;
          priority?: string;
          requested_by: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          silo_id?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          admin_id?: string;
          assigned_technician_id?: string | null;
          created_at?: string;
          description?: string | null;
          device_id?: string | null;
          id?: string;
          priority?: string;
          requested_by?: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          silo_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_requests_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "maintenance_requests_assigned_technician_id_fkey";
            columns: ["assigned_technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_requests_assigned_technician_id_fkey";
            columns: ["assigned_technician_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "maintenance_requests_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "sensor_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_requests_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_requests_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
        ];
      };
      metric_export_tokens: {
        Row: {
          created_at: string;
          expires_at: string;
          filters: Json;
          id: string;
          metric_key: string;
          requested_by: string;
          token: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          filters?: Json;
          id?: string;
          metric_key: string;
          requested_by: string;
          token: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          filters?: Json;
          id?: string;
          metric_key?: string;
          requested_by?: string;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      metric_registry: {
        Row: {
          active: boolean;
          allowed_roles: string[];
          chart_hint: string;
          created_at: string;
          created_by: string | null;
          csv_template: string | null;
          default_filters: Json;
          description: string | null;
          format: string | null;
          id: string;
          key: string;
          label: string;
          sql_template: string;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          allowed_roles?: string[];
          chart_hint?: string;
          created_at?: string;
          created_by?: string | null;
          csv_template?: string | null;
          default_filters?: Json;
          description?: string | null;
          format?: string | null;
          id?: string;
          key: string;
          label: string;
          sql_template: string;
          unit?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          allowed_roles?: string[];
          chart_hint?: string;
          created_at?: string;
          created_by?: string | null;
          csv_template?: string | null;
          default_filters?: Json;
          description?: string | null;
          format?: string | null;
          id?: string;
          key?: string;
          label?: string;
          sql_template?: string;
          unit?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ml_inference_requests: {
        Row: {
          admin_id: string | null;
          confidence: number | null;
          created_at: string;
          device_id: string | null;
          error_message: string | null;
          id: string;
          latency_ms: number | null;
          model_name: string;
          risk_class: string | null;
          risk_score: number | null;
          silo_id: string | null;
          source: string | null;
          success: boolean;
          triggered_by: string;
        };
        Insert: {
          admin_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          device_id?: string | null;
          error_message?: string | null;
          id?: string;
          latency_ms?: number | null;
          model_name?: string;
          risk_class?: string | null;
          risk_score?: number | null;
          silo_id?: string | null;
          source?: string | null;
          success: boolean;
          triggered_by?: string;
        };
        Update: {
          admin_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          device_id?: string | null;
          error_message?: string | null;
          id?: string;
          latency_ms?: number | null;
          model_name?: string;
          risk_class?: string | null;
          risk_score?: number | null;
          silo_id?: string | null;
          source?: string | null;
          success?: boolean;
          triggered_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ml_inference_requests_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "sensor_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ml_inference_requests_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ml_inference_requests_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
        ];
      };
      ml_model_metadata: {
        Row: {
          active_accuracy: number | null;
          active_model_version: string | null;
          best_params: Json | null;
          grain_type: string;
          last_fast_run: string | null;
          last_nightly_run: string | null;
          updated_at: string | null;
        };
        Insert: {
          active_accuracy?: number | null;
          active_model_version?: string | null;
          best_params?: Json | null;
          grain_type: string;
          last_fast_run?: string | null;
          last_nightly_run?: string | null;
          updated_at?: string | null;
        };
        Update: {
          active_accuracy?: number | null;
          active_model_version?: string | null;
          best_params?: Json | null;
          grain_type?: string;
          last_fast_run?: string | null;
          last_nightly_run?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      mobile_commerce_settings: {
        Row: {
          allowed_payment_methods: Json;
          cart_max_items: number;
          cart_ttl_hours: number;
          checkout_enabled: boolean;
          cod_max_cents: number;
          currency_default: string;
          id: string;
          max_order_cents: number;
          min_order_cents: number;
          platform_fee_bps: number;
          quote_ttl_seconds: number;
          refund_policy_url: string | null;
          stripe_publishable_key_override: string | null;
          terms_url: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          allowed_payment_methods?: Json;
          cart_max_items?: number;
          cart_ttl_hours?: number;
          checkout_enabled?: boolean;
          cod_max_cents?: number;
          currency_default?: string;
          id?: string;
          max_order_cents?: number;
          min_order_cents?: number;
          platform_fee_bps?: number;
          quote_ttl_seconds?: number;
          refund_policy_url?: string | null;
          stripe_publishable_key_override?: string | null;
          terms_url?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          allowed_payment_methods?: Json;
          cart_max_items?: number;
          cart_ttl_hours?: number;
          checkout_enabled?: boolean;
          cod_max_cents?: number;
          currency_default?: string;
          id?: string;
          max_order_cents?: number;
          min_order_cents?: number;
          platform_fee_bps?: number;
          quote_ttl_seconds?: number;
          refund_policy_url?: string | null;
          stripe_publishable_key_override?: string | null;
          terms_url?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      mobile_deep_link_routes: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          key: string;
          native_route: string;
          params_schema: Json;
          updated_at: string;
          updated_by: string | null;
          web_fallback: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          key: string;
          native_route: string;
          params_schema?: Json;
          updated_at?: string;
          updated_by?: string | null;
          web_fallback: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          key?: string;
          native_route?: string;
          params_schema?: Json;
          updated_at?: string;
          updated_by?: string | null;
          web_fallback?: string;
        };
        Relationships: [];
      };
      mobile_devices: {
        Row: {
          app_version: string | null;
          created_at: string;
          id: string;
          last_push_error: string | null;
          last_push_error_at: string | null;
          last_push_success_at: string | null;
          last_seen_at: string;
          locale: string | null;
          os_version: string | null;
          platform: string;
          push_token: string | null;
          revoked_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          app_version?: string | null;
          created_at?: string;
          id?: string;
          last_push_error?: string | null;
          last_push_error_at?: string | null;
          last_push_success_at?: string | null;
          last_seen_at?: string;
          locale?: string | null;
          os_version?: string | null;
          platform: string;
          push_token?: string | null;
          revoked_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          app_version?: string | null;
          created_at?: string;
          id?: string;
          last_push_error?: string | null;
          last_push_error_at?: string | null;
          last_push_success_at?: string | null;
          last_seen_at?: string;
          locale?: string | null;
          os_version?: string | null;
          platform?: string;
          push_token?: string | null;
          revoked_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      mobile_field_bundles: {
        Row: {
          bundle: Json;
          bundle_bytes: number;
          etag: string;
          expires_at: string;
          generated_at: string;
          user_id: string;
        };
        Insert: {
          bundle?: Json;
          bundle_bytes?: number;
          etag: string;
          expires_at?: string;
          generated_at?: string;
          user_id: string;
        };
        Update: {
          bundle?: Json;
          bundle_bytes?: number;
          etag?: string;
          expires_at?: string;
          generated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      mobile_field_settings: {
        Row: {
          actuator_override_allowed: boolean;
          bundle_max_incidents: number;
          bundle_max_tasks: number;
          bundle_ttl_minutes: number;
          default_page_size: number;
          geofence_enforced: boolean;
          id: boolean;
          incident_categories: Json;
          max_attachment_mb: number;
          offline_window_hours: number;
          required_photo_rules: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          actuator_override_allowed?: boolean;
          bundle_max_incidents?: number;
          bundle_max_tasks?: number;
          bundle_ttl_minutes?: number;
          default_page_size?: number;
          geofence_enforced?: boolean;
          id?: boolean;
          incident_categories?: Json;
          max_attachment_mb?: number;
          offline_window_hours?: number;
          required_photo_rules?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          actuator_override_allowed?: boolean;
          bundle_max_incidents?: number;
          bundle_max_tasks?: number;
          bundle_ttl_minutes?: number;
          default_page_size?: number;
          geofence_enforced?: boolean;
          id?: boolean;
          incident_categories?: Json;
          max_attachment_mb?: number;
          offline_window_hours?: number;
          required_photo_rules?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      mobile_idempotency_keys: {
        Row: {
          created_at: string;
          endpoint: string;
          key: string;
          request_hash: string | null;
          response: Json | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          endpoint: string;
          key: string;
          request_hash?: string | null;
          response?: Json | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          endpoint?: string;
          key?: string;
          request_hash?: string | null;
          response?: Json | null;
          user_id?: string;
        };
        Relationships: [];
      };
      mobile_marketplace_settings: {
        Row: {
          allowed_attachment_types: Json;
          featured_commodities: Json;
          hero_headline: string;
          hero_subheadline: string;
          id: boolean;
          kill_switch: boolean;
          kill_switch_message: string | null;
          max_message_length: number;
          min_app_build: number;
          moderation_banner: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          allowed_attachment_types?: Json;
          featured_commodities?: Json;
          hero_headline?: string;
          hero_subheadline?: string;
          id?: boolean;
          kill_switch?: boolean;
          kill_switch_message?: string | null;
          max_message_length?: number;
          min_app_build?: number;
          moderation_banner?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          allowed_attachment_types?: Json;
          featured_commodities?: Json;
          hero_headline?: string;
          hero_subheadline?: string;
          id?: boolean;
          kill_switch?: boolean;
          kill_switch_message?: string | null;
          max_message_length?: number;
          min_app_build?: number;
          moderation_banner?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      mobile_sync_locks: {
        Row: {
          endpoint: string;
          idempotency_key: string | null;
          locked_at: string;
          locked_by: string | null;
        };
        Insert: {
          endpoint: string;
          idempotency_key?: string | null;
          locked_at?: string;
          locked_by?: string | null;
        };
        Update: {
          endpoint?: string;
          idempotency_key?: string | null;
          locked_at?: string;
          locked_by?: string | null;
        };
        Relationships: [];
      };
      mobile_sync_runs: {
        Row: {
          actor_user_id: string | null;
          duration_ms: number | null;
          endpoint: string;
          error_message: string | null;
          finished_at: string | null;
          id: string;
          idempotency_key: string | null;
          manual: boolean;
          request_meta: Json;
          row_count: number | null;
          started_at: string;
          status: string;
        };
        Insert: {
          actor_user_id?: string | null;
          duration_ms?: number | null;
          endpoint: string;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          manual?: boolean;
          request_meta?: Json;
          row_count?: number | null;
          started_at?: string;
          status: string;
        };
        Update: {
          actor_user_id?: string | null;
          duration_ms?: number | null;
          endpoint?: string;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          manual?: boolean;
          request_meta?: Json;
          row_count?: number | null;
          started_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      model_versions: {
        Row: {
          accuracy: number | null;
          created_at: string | null;
          f1_score: number | null;
          file_hash: string | null;
          grain_type: string;
          id: number;
          is_active: boolean | null;
          sanity_pass_rate: number | null;
          storage_path: string;
          trained_by: string | null;
          version: string;
        };
        Insert: {
          accuracy?: number | null;
          created_at?: string | null;
          f1_score?: number | null;
          file_hash?: string | null;
          grain_type: string;
          id?: number;
          is_active?: boolean | null;
          sanity_pass_rate?: number | null;
          storage_path: string;
          trained_by?: string | null;
          version: string;
        };
        Update: {
          accuracy?: number | null;
          created_at?: string | null;
          f1_score?: number | null;
          file_hash?: string | null;
          grain_type?: string;
          id?: number;
          is_active?: boolean | null;
          sanity_pass_rate?: number | null;
          storage_path?: string;
          trained_by?: string | null;
          version?: string;
        };
        Relationships: [];
      };
      notification_channel_prefs: {
        Row: {
          categories: Json;
          created_at: string;
          email_enabled: boolean;
          push_categories: Json;
          push_enabled: boolean;
          sms_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          categories?: Json;
          created_at?: string;
          email_enabled?: boolean;
          push_categories?: Json;
          push_enabled?: boolean;
          sms_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          categories?: Json;
          created_at?: string;
          email_enabled?: boolean;
          push_categories?: Json;
          push_enabled?: boolean;
          sms_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          attempts: number;
          channel: string;
          created_at: string;
          error: string | null;
          id: string;
          notification_id: string;
          provider: string | null;
          provider_message_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          channel: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          notification_id: string;
          provider?: string | null;
          provider_message_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          channel?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          notification_id?: string;
          provider?: string | null;
          provider_message_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          action_url: string | null;
          admin_id: string;
          category: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          message: string;
          metadata: Json;
          read: boolean;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          action_url?: string | null;
          admin_id: string;
          category?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          message: string;
          metadata?: Json;
          read?: boolean;
          read_at?: string | null;
          title: string;
          type?: string;
          user_id: string;
        };
        Update: {
          action_url?: string | null;
          admin_id?: string;
          category?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          message?: string;
          metadata?: Json;
          read?: boolean;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      plan_prices: {
        Row: {
          annual_price_cents: number | null;
          currency: string;
          features: Json;
          is_active: boolean;
          plan_id: string;
          product_id: string;
          setup_price_id: string | null;
          stripe_price_id_annual: string | null;
          stripe_price_id_monthly: string | null;
          subscription_price_id: string;
          updated_at: string;
        };
        Insert: {
          annual_price_cents?: number | null;
          currency?: string;
          features?: Json;
          is_active?: boolean;
          plan_id: string;
          product_id: string;
          setup_price_id?: string | null;
          stripe_price_id_annual?: string | null;
          stripe_price_id_monthly?: string | null;
          subscription_price_id: string;
          updated_at?: string;
        };
        Update: {
          annual_price_cents?: number | null;
          currency?: string;
          features?: Json;
          is_active?: boolean;
          plan_id?: string;
          product_id?: string;
          setup_price_id?: string | null;
          stripe_price_id_annual?: string | null;
          stripe_price_id_monthly?: string | null;
          subscription_price_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plan_thresholds: {
        Row: {
          created_at: string;
          currency: string;
          description: string | null;
          features: Json;
          is_active: boolean;
          is_popular: boolean;
          max_active_alert_rules: number | null;
          max_actuators: number;
          max_batches: number;
          max_buyers: number;
          max_sensors: number;
          max_silos: number;
          max_users: number;
          max_warehouses: number;
          name: string;
          plan_id: string;
          price_cents: number;
          sort_order: number;
          stripe_price_monthly_id: string | null;
          stripe_price_yearly_id: string | null;
          stripe_product_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          description?: string | null;
          features?: Json;
          is_active?: boolean;
          is_popular?: boolean;
          max_active_alert_rules?: number | null;
          max_actuators?: number;
          max_batches?: number;
          max_buyers?: number;
          max_sensors?: number;
          max_silos?: number;
          max_users?: number;
          max_warehouses?: number;
          name: string;
          plan_id: string;
          price_cents?: number;
          sort_order?: number;
          stripe_price_monthly_id?: string | null;
          stripe_price_yearly_id?: string | null;
          stripe_product_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          description?: string | null;
          features?: Json;
          is_active?: boolean;
          is_popular?: boolean;
          max_active_alert_rules?: number | null;
          max_actuators?: number;
          max_batches?: number;
          max_buyers?: number;
          max_sensors?: number;
          max_silos?: number;
          max_users?: number;
          max_warehouses?: number;
          name?: string;
          plan_id?: string;
          price_cents?: number;
          sort_order?: number;
          stripe_price_monthly_id?: string | null;
          stripe_price_yearly_id?: string | null;
          stripe_product_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_email_digest_log: {
        Row: {
          created_at: string;
          digest_key: string;
          id: string;
          payload: Json;
          recipients_count: number;
          window_end: string;
          window_start: string;
        };
        Insert: {
          created_at?: string;
          digest_key: string;
          id?: string;
          payload?: Json;
          recipients_count?: number;
          window_end: string;
          window_start: string;
        };
        Update: {
          created_at?: string;
          digest_key?: string;
          id?: string;
          payload?: Json;
          recipients_count?: number;
          window_end?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          config: Json;
          id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          config?: Json;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          config?: Json;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      platform_settings_audit: {
        Row: {
          action: string;
          actor_user_id: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          id: string;
          settings_key: string;
        };
        Insert: {
          action?: string;
          actor_user_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: string;
          settings_key: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: string;
          settings_key?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          address: Json | null;
          admin_id: string | null;
          auto_upgrade_enabled: boolean;
          avatar: string | null;
          billing_cycle: string | null;
          blocked: boolean | null;
          business_type: string | null;
          certification_level: string | null;
          created_at: string | null;
          created_by: string | null;
          current_job_count: number | null;
          current_period_end: string | null;
          customer_id: string | null;
          deleted_at: string | null;
          department: string | null;
          email: string | null;
          email_verified: boolean | null;
          employee_id: string | null;
          fcm_tokens: Json | null;
          first_login: boolean | null;
          has_access: string | null;
          hubspot_contact_id: string | null;
          hubspot_deal_id: string | null;
          id: string;
          invitation_expires: string | null;
          invitation_role: string | null;
          invitation_status: Database["public"]["Enums"]["invitation_status"] | null;
          invitation_token: string | null;
          invited_by: string | null;
          is_active: boolean | null;
          last_active_at: string | null;
          last_login: string | null;
          location: Json | null;
          login_count: number;
          max_concurrent_jobs: number | null;
          name: string;
          notes: string | null;
          phone: string | null;
          phone_e164: string | null;
          plan_limits_notified_at: string | null;
          plan_usage_actuators: number | null;
          plan_usage_sensors: number | null;
          plan_usage_silos: number | null;
          plan_usage_users: number | null;
          preferences: Json | null;
          price_id: string | null;
          retention_discount_pct: number | null;
          retention_discount_until: string | null;
          retention_offer_used_at: string | null;
          service_areas: string[] | null;
          shift_pattern: string | null;
          status: Database["public"]["Enums"]["user_status"] | null;
          stripe_customer_id: string | null;
          stripe_schedule_id: string | null;
          stripe_subscription_id: string | null;
          stripe_subscription_item_id: string | null;
          stripe_subscription_status: string | null;
          subscription_plan: string | null;
          suspended: boolean;
          technician_status: Database["public"]["Enums"]["technician_status"] | null;
          trial_ends_at: string | null;
          updated_at: string | null;
          updated_by: string | null;
          warehouse_id: string | null;
        };
        Insert: {
          address?: Json | null;
          admin_id?: string | null;
          auto_upgrade_enabled?: boolean;
          avatar?: string | null;
          billing_cycle?: string | null;
          blocked?: boolean | null;
          business_type?: string | null;
          certification_level?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          current_job_count?: number | null;
          current_period_end?: string | null;
          customer_id?: string | null;
          deleted_at?: string | null;
          department?: string | null;
          email?: string | null;
          email_verified?: boolean | null;
          employee_id?: string | null;
          fcm_tokens?: Json | null;
          first_login?: boolean | null;
          has_access?: string | null;
          hubspot_contact_id?: string | null;
          hubspot_deal_id?: string | null;
          id: string;
          invitation_expires?: string | null;
          invitation_role?: string | null;
          invitation_status?: Database["public"]["Enums"]["invitation_status"] | null;
          invitation_token?: string | null;
          invited_by?: string | null;
          is_active?: boolean | null;
          last_active_at?: string | null;
          last_login?: string | null;
          location?: Json | null;
          login_count?: number;
          max_concurrent_jobs?: number | null;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          phone_e164?: string | null;
          plan_limits_notified_at?: string | null;
          plan_usage_actuators?: number | null;
          plan_usage_sensors?: number | null;
          plan_usage_silos?: number | null;
          plan_usage_users?: number | null;
          preferences?: Json | null;
          price_id?: string | null;
          retention_discount_pct?: number | null;
          retention_discount_until?: string | null;
          retention_offer_used_at?: string | null;
          service_areas?: string[] | null;
          shift_pattern?: string | null;
          status?: Database["public"]["Enums"]["user_status"] | null;
          stripe_customer_id?: string | null;
          stripe_schedule_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_subscription_item_id?: string | null;
          stripe_subscription_status?: string | null;
          subscription_plan?: string | null;
          suspended?: boolean;
          technician_status?: Database["public"]["Enums"]["technician_status"] | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          warehouse_id?: string | null;
        };
        Update: {
          address?: Json | null;
          admin_id?: string | null;
          auto_upgrade_enabled?: boolean;
          avatar?: string | null;
          billing_cycle?: string | null;
          blocked?: boolean | null;
          business_type?: string | null;
          certification_level?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          current_job_count?: number | null;
          current_period_end?: string | null;
          customer_id?: string | null;
          deleted_at?: string | null;
          department?: string | null;
          email?: string | null;
          email_verified?: boolean | null;
          employee_id?: string | null;
          fcm_tokens?: Json | null;
          first_login?: boolean | null;
          has_access?: string | null;
          hubspot_contact_id?: string | null;
          hubspot_deal_id?: string | null;
          id?: string;
          invitation_expires?: string | null;
          invitation_role?: string | null;
          invitation_status?: Database["public"]["Enums"]["invitation_status"] | null;
          invitation_token?: string | null;
          invited_by?: string | null;
          is_active?: boolean | null;
          last_active_at?: string | null;
          last_login?: string | null;
          location?: Json | null;
          login_count?: number;
          max_concurrent_jobs?: number | null;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          phone_e164?: string | null;
          plan_limits_notified_at?: string | null;
          plan_usage_actuators?: number | null;
          plan_usage_sensors?: number | null;
          plan_usage_silos?: number | null;
          plan_usage_users?: number | null;
          preferences?: Json | null;
          price_id?: string | null;
          retention_discount_pct?: number | null;
          retention_discount_until?: string | null;
          retention_offer_used_at?: string | null;
          service_areas?: string[] | null;
          shift_pattern?: string | null;
          status?: Database["public"]["Enums"]["user_status"] | null;
          stripe_customer_id?: string | null;
          stripe_schedule_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_subscription_item_id?: string | null;
          stripe_subscription_status?: string | null;
          subscription_plan?: string | null;
          suspended?: boolean;
          technician_status?: Database["public"]["Enums"]["technician_status"] | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_profiles_warehouse";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "fk_profiles_warehouse";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "profiles_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "profiles_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "profiles_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      rag_ingestion_log: {
        Row: {
          category: string;
          completed_at: string | null;
          document_id: string;
          document_title: string;
          duration_seconds: number | null;
          fail_reason: string | null;
          id: number;
          ingested_at: string | null;
          source_file: string;
          status: string;
          tenant_id: string;
          total_chunks: number;
        };
        Insert: {
          category: string;
          completed_at?: string | null;
          document_id: string;
          document_title: string;
          duration_seconds?: number | null;
          fail_reason?: string | null;
          id?: number;
          ingested_at?: string | null;
          source_file: string;
          status?: string;
          tenant_id: string;
          total_chunks?: number;
        };
        Update: {
          category?: string;
          completed_at?: string | null;
          document_id?: string;
          document_title?: string;
          duration_seconds?: number | null;
          fail_reason?: string | null;
          id?: number;
          ingested_at?: string | null;
          source_file?: string;
          status?: string;
          tenant_id?: string;
          total_chunks?: number;
        };
        Relationships: [];
      };
      rag_knowledge_base: {
        Row: {
          category: string;
          chunk_content: string;
          chunk_index: number;
          created_at: string | null;
          document_id: string;
          document_title: string;
          embedding: string;
          id: string;
          metadata: Json | null;
          tenant_id: string;
        };
        Insert: {
          category: string;
          chunk_content: string;
          chunk_index: number;
          created_at?: string | null;
          document_id: string;
          document_title: string;
          embedding: string;
          id?: string;
          metadata?: Json | null;
          tenant_id: string;
        };
        Update: {
          category?: string;
          chunk_content?: string;
          chunk_index?: number;
          created_at?: string | null;
          document_id?: string;
          document_title?: string;
          embedding?: string;
          id?: string;
          metadata?: Json | null;
          tenant_id?: string;
        };
        Relationships: [];
      };
      retrain_log: {
        Row: {
          accuracy: number | null;
          duration_seconds: number | null;
          fail_reason: string | null;
          finished_at: string | null;
          grain_type: string;
          id: number;
          model_version_id: number | null;
          rows_used: number | null;
          sanity_pass_rate: number | null;
          started_at: string | null;
          status: string;
          trigger: string;
        };
        Insert: {
          accuracy?: number | null;
          duration_seconds?: number | null;
          fail_reason?: string | null;
          finished_at?: string | null;
          grain_type: string;
          id?: number;
          model_version_id?: number | null;
          rows_used?: number | null;
          sanity_pass_rate?: number | null;
          started_at?: string | null;
          status: string;
          trigger: string;
        };
        Update: {
          accuracy?: number | null;
          duration_seconds?: number | null;
          fail_reason?: string | null;
          finished_at?: string | null;
          grain_type?: string;
          id?: number;
          model_version_id?: number | null;
          rows_used?: number | null;
          sanity_pass_rate?: number | null;
          started_at?: string | null;
          status?: string;
          trigger?: string;
        };
        Relationships: [
          {
            foreignKeyName: "retrain_log_model_version_id_fkey";
            columns: ["model_version_id"];
            isOneToOne: false;
            referencedRelation: "model_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      security_events: {
        Row: {
          created_at: string;
          event: string;
          id: string;
          ip: string | null;
          meta: Json;
          tenant_id: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          event: string;
          id?: string;
          ip?: string | null;
          meta?: Json;
          tenant_id?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          event?: string;
          id?: string;
          ip?: string | null;
          meta?: Json;
          tenant_id?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      seller_payout_accounts: {
        Row: {
          account_holder: string | null;
          account_number_encrypted: string | null;
          bank_name: string | null;
          country: string | null;
          created_at: string;
          currency: string;
          iban_encrypted: string | null;
          id: string;
          metadata: Json;
          method: string;
          minimum_payout_override: number | null;
          seller_id: string;
          swift: string | null;
          updated_at: string;
          verified: boolean;
        };
        Insert: {
          account_holder?: string | null;
          account_number_encrypted?: string | null;
          bank_name?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string;
          iban_encrypted?: string | null;
          id?: string;
          metadata?: Json;
          method?: string;
          minimum_payout_override?: number | null;
          seller_id: string;
          swift?: string | null;
          updated_at?: string;
          verified?: boolean;
        };
        Update: {
          account_holder?: string | null;
          account_number_encrypted?: string | null;
          bank_name?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string;
          iban_encrypted?: string | null;
          id?: string;
          metadata?: Json;
          method?: string;
          minimum_payout_override?: number | null;
          seller_id?: string;
          swift?: string | null;
          updated_at?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "seller_payout_accounts_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_payout_accounts_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: true;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      seller_payout_items: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          ledger_entry_id: string;
          payout_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          ledger_entry_id: string;
          payout_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          ledger_entry_id?: string;
          payout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_payout_items_ledger_entry_id_fkey";
            columns: ["ledger_entry_id"];
            isOneToOne: false;
            referencedRelation: "finance_ledger_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_payout_items_payout_id_fkey";
            columns: ["payout_id"];
            isOneToOne: false;
            referencedRelation: "seller_payouts";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_payouts: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          currency: string;
          failed_reason: string | null;
          fees_amount: number;
          gross_amount: number;
          id: string;
          method: string;
          net_amount: number;
          notes: string | null;
          paid_at: string | null;
          period_end: string | null;
          period_start: string | null;
          receipt_url: string | null;
          reference: string | null;
          seller_id: string;
          statement_url: string | null;
          status: string;
          tax_withheld: number;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          currency?: string;
          failed_reason?: string | null;
          fees_amount?: number;
          gross_amount?: number;
          id?: string;
          method?: string;
          net_amount?: number;
          notes?: string | null;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          receipt_url?: string | null;
          reference?: string | null;
          seller_id: string;
          statement_url?: string | null;
          status?: string;
          tax_withheld?: number;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          currency?: string;
          failed_reason?: string | null;
          fees_amount?: number;
          gross_amount?: number;
          id?: string;
          method?: string;
          net_amount?: number;
          notes?: string | null;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          receipt_url?: string | null;
          reference?: string | null;
          seller_id?: string;
          statement_url?: string | null;
          status?: string;
          tax_withheld?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_payouts_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_payouts_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      sensor_devices: {
        Row: {
          admin_id: string;
          battery_level: number | null;
          calibration_due_date: string | null;
          calibration_interval_days: number | null;
          capabilities: Json | null;
          category: string;
          communication_protocol: string | null;
          connection_status: string | null;
          created_at: string | null;
          created_by: string;
          data_stats: Json | null;
          data_transmission_interval: number | null;
          deleted_at: string | null;
          device_id: string;
          device_name: string;
          device_type: string;
          expected_heartbeat_interval: number | null;
          firmware_version: string | null;
          hardware_version: string | null;
          health_metrics: Json | null;
          human_requested_fan: boolean | null;
          id: string;
          ip_address: string | null;
          is_enabled: boolean | null;
          last_calibration_date: string | null;
          last_heartbeat: string | null;
          last_maintenance_date: string | null;
          mac_address: string | null;
          manufacturer: string | null;
          ml_decision: string | null;
          ml_requested_fan: boolean | null;
          model: string | null;
          mqtt_topic: string | null;
          next_maintenance_date: string | null;
          notes: string | null;
          power_source: Database["public"]["Enums"]["power_source"] | null;
          purchase_date: string | null;
          sensor_types: Database["public"]["Enums"]["sensor_type"][] | null;
          signal_strength: number | null;
          silo_id: string;
          status: Database["public"]["Enums"]["device_status"] | null;
          tags: string[] | null;
          target_fan_speed: number | null;
          thresholds: Json | null;
          updated_at: string | null;
          updated_by: string | null;
          warehouse_id: string | null;
          warranty_expiry: string | null;
          wifi_ssid: string | null;
        };
        Insert: {
          admin_id: string;
          battery_level?: number | null;
          calibration_due_date?: string | null;
          calibration_interval_days?: number | null;
          capabilities?: Json | null;
          category: string;
          communication_protocol?: string | null;
          connection_status?: string | null;
          created_at?: string | null;
          created_by: string;
          data_stats?: Json | null;
          data_transmission_interval?: number | null;
          deleted_at?: string | null;
          device_id: string;
          device_name: string;
          device_type: string;
          expected_heartbeat_interval?: number | null;
          firmware_version?: string | null;
          hardware_version?: string | null;
          health_metrics?: Json | null;
          human_requested_fan?: boolean | null;
          id?: string;
          ip_address?: string | null;
          is_enabled?: boolean | null;
          last_calibration_date?: string | null;
          last_heartbeat?: string | null;
          last_maintenance_date?: string | null;
          mac_address?: string | null;
          manufacturer?: string | null;
          ml_decision?: string | null;
          ml_requested_fan?: boolean | null;
          model?: string | null;
          mqtt_topic?: string | null;
          next_maintenance_date?: string | null;
          notes?: string | null;
          power_source?: Database["public"]["Enums"]["power_source"] | null;
          purchase_date?: string | null;
          sensor_types?: Database["public"]["Enums"]["sensor_type"][] | null;
          signal_strength?: number | null;
          silo_id: string;
          status?: Database["public"]["Enums"]["device_status"] | null;
          tags?: string[] | null;
          target_fan_speed?: number | null;
          thresholds?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
          warehouse_id?: string | null;
          warranty_expiry?: string | null;
          wifi_ssid?: string | null;
        };
        Update: {
          admin_id?: string;
          battery_level?: number | null;
          calibration_due_date?: string | null;
          calibration_interval_days?: number | null;
          capabilities?: Json | null;
          category?: string;
          communication_protocol?: string | null;
          connection_status?: string | null;
          created_at?: string | null;
          created_by?: string;
          data_stats?: Json | null;
          data_transmission_interval?: number | null;
          deleted_at?: string | null;
          device_id?: string;
          device_name?: string;
          device_type?: string;
          expected_heartbeat_interval?: number | null;
          firmware_version?: string | null;
          hardware_version?: string | null;
          health_metrics?: Json | null;
          human_requested_fan?: boolean | null;
          id?: string;
          ip_address?: string | null;
          is_enabled?: boolean | null;
          last_calibration_date?: string | null;
          last_heartbeat?: string | null;
          last_maintenance_date?: string | null;
          mac_address?: string | null;
          manufacturer?: string | null;
          ml_decision?: string | null;
          ml_requested_fan?: boolean | null;
          model?: string | null;
          mqtt_topic?: string | null;
          next_maintenance_date?: string | null;
          notes?: string | null;
          power_source?: Database["public"]["Enums"]["power_source"] | null;
          purchase_date?: string | null;
          sensor_types?: Database["public"]["Enums"]["sensor_type"][] | null;
          signal_strength?: number | null;
          silo_id?: string;
          status?: Database["public"]["Enums"]["device_status"] | null;
          tags?: string[] | null;
          target_fan_speed?: number | null;
          thresholds?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
          warehouse_id?: string | null;
          warranty_expiry?: string | null;
          wifi_ssid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sensor_devices_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_devices_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "sensor_devices_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_devices_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "sensor_devices_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_devices_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_devices_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_devices_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "sensor_devices_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "sensor_devices_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      sensor_readings: {
        Row: {
          admin_id: string;
          aggregation_period: string | null;
          airflow: number | null;
          ambient_humidity: number | null;
          ambient_light: number | null;
          ambient_temperature: number | null;
          anomaly_detected: boolean | null;
          batch_id: string | null;
          battery_level: number | null;
          co2_value: number | null;
          condensation_risk: boolean | null;
          confidence_score: number | null;
          created_at: string | null;
          deleted_at: string | null;
          device_id: string | null;
          dew_point: number | null;
          dew_point_gap: number | null;
          fan_duty_cycle: number | null;
          fan_recommendation: string | null;
          fan_rpm: number | null;
          fan_speed_factor: number | null;
          fan_state: number | null;
          fan_status: string | null;
          grain_type: string | null;
          humidity_value: number | null;
          id: string;
          ingested_at: string;
          is_aggregated: boolean | null;
          is_valid: boolean | null;
          lid_state: number | null;
          light_value: number | null;
          ml_confidence: number | null;
          ml_risk_class: string | null;
          ml_risk_score: number | null;
          moisture_value: number | null;
          pest_presence_flag: boolean | null;
          pest_presence_score: number | null;
          ph_value: number | null;
          pressure_value: number | null;
          quality_flag: string;
          raw_payload: Json | null;
          reading_timestamp: string;
          signal_strength: number | null;
          silo_id: string | null;
          source: string;
          spoilage_label: string | null;
          storage_days: number | null;
          temperature_unit: string | null;
          temperature_value: number | null;
          updated_at: string | null;
          voc_baseline_24h: number | null;
          voc_rate_30min: number | null;
          voc_rate_5min: number | null;
          voc_relative: number | null;
          voc_relative_30min: number | null;
          voc_relative_5min: number | null;
          voc_value: number | null;
          warehouse_id: string | null;
        };
        Insert: {
          admin_id: string;
          aggregation_period?: string | null;
          airflow?: number | null;
          ambient_humidity?: number | null;
          ambient_light?: number | null;
          ambient_temperature?: number | null;
          anomaly_detected?: boolean | null;
          batch_id?: string | null;
          battery_level?: number | null;
          co2_value?: number | null;
          condensation_risk?: boolean | null;
          confidence_score?: number | null;
          created_at?: string | null;
          deleted_at?: string | null;
          device_id?: string | null;
          dew_point?: number | null;
          dew_point_gap?: number | null;
          fan_duty_cycle?: number | null;
          fan_recommendation?: string | null;
          fan_rpm?: number | null;
          fan_speed_factor?: number | null;
          fan_state?: number | null;
          fan_status?: string | null;
          grain_type?: string | null;
          humidity_value?: number | null;
          id?: string;
          ingested_at?: string;
          is_aggregated?: boolean | null;
          is_valid?: boolean | null;
          lid_state?: number | null;
          light_value?: number | null;
          ml_confidence?: number | null;
          ml_risk_class?: string | null;
          ml_risk_score?: number | null;
          moisture_value?: number | null;
          pest_presence_flag?: boolean | null;
          pest_presence_score?: number | null;
          ph_value?: number | null;
          pressure_value?: number | null;
          quality_flag?: string;
          raw_payload?: Json | null;
          reading_timestamp?: string;
          signal_strength?: number | null;
          silo_id?: string | null;
          source?: string;
          spoilage_label?: string | null;
          storage_days?: number | null;
          temperature_unit?: string | null;
          temperature_value?: number | null;
          updated_at?: string | null;
          voc_baseline_24h?: number | null;
          voc_rate_30min?: number | null;
          voc_rate_5min?: number | null;
          voc_relative?: number | null;
          voc_relative_30min?: number | null;
          voc_relative_5min?: number | null;
          voc_value?: number | null;
          warehouse_id?: string | null;
        };
        Update: {
          admin_id?: string;
          aggregation_period?: string | null;
          airflow?: number | null;
          ambient_humidity?: number | null;
          ambient_light?: number | null;
          ambient_temperature?: number | null;
          anomaly_detected?: boolean | null;
          batch_id?: string | null;
          battery_level?: number | null;
          co2_value?: number | null;
          condensation_risk?: boolean | null;
          confidence_score?: number | null;
          created_at?: string | null;
          deleted_at?: string | null;
          device_id?: string | null;
          dew_point?: number | null;
          dew_point_gap?: number | null;
          fan_duty_cycle?: number | null;
          fan_recommendation?: string | null;
          fan_rpm?: number | null;
          fan_speed_factor?: number | null;
          fan_state?: number | null;
          fan_status?: string | null;
          grain_type?: string | null;
          humidity_value?: number | null;
          id?: string;
          ingested_at?: string;
          is_aggregated?: boolean | null;
          is_valid?: boolean | null;
          lid_state?: number | null;
          light_value?: number | null;
          ml_confidence?: number | null;
          ml_risk_class?: string | null;
          ml_risk_score?: number | null;
          moisture_value?: number | null;
          pest_presence_flag?: boolean | null;
          pest_presence_score?: number | null;
          ph_value?: number | null;
          pressure_value?: number | null;
          quality_flag?: string;
          raw_payload?: Json | null;
          reading_timestamp?: string;
          signal_strength?: number | null;
          silo_id?: string | null;
          source?: string;
          spoilage_label?: string | null;
          storage_days?: number | null;
          temperature_unit?: string | null;
          temperature_value?: number | null;
          updated_at?: string | null;
          voc_baseline_24h?: number | null;
          voc_rate_30min?: number | null;
          voc_rate_5min?: number | null;
          voc_relative?: number | null;
          voc_relative_30min?: number | null;
          voc_relative_5min?: number | null;
          voc_value?: number | null;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sensor_readings_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_readings_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "sensor_readings_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_readings_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "sensor_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_readings_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_readings_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_readings_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "sensor_readings_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      sensor_thresholds: {
        Row: {
          admin_id: string;
          created_at: string;
          created_by: string | null;
          critical_max: number | null;
          critical_min: number | null;
          enabled: boolean;
          hysteresis: number;
          id: string;
          max_value: number | null;
          metric: string;
          min_value: number | null;
          silo_id: string;
          updated_at: string;
          window_seconds: number;
        };
        Insert: {
          admin_id: string;
          created_at?: string;
          created_by?: string | null;
          critical_max?: number | null;
          critical_min?: number | null;
          enabled?: boolean;
          hysteresis?: number;
          id?: string;
          max_value?: number | null;
          metric: string;
          min_value?: number | null;
          silo_id: string;
          updated_at?: string;
          window_seconds?: number;
        };
        Update: {
          admin_id?: string;
          created_at?: string;
          created_by?: string | null;
          critical_max?: number | null;
          critical_min?: number | null;
          enabled?: boolean;
          hysteresis?: number;
          id?: string;
          max_value?: number | null;
          metric?: string;
          min_value?: number | null;
          silo_id?: string;
          updated_at?: string;
          window_seconds?: number;
        };
        Relationships: [];
      };
      shipment_assignments: {
        Row: {
          actual_delivery_at: string | null;
          actual_pickup_at: string | null;
          assigned_at: string;
          assigned_by: string | null;
          carrier_id: string;
          created_at: string;
          distance_km: number | null;
          driver_id: string | null;
          id: string;
          planned_delivery_at: string | null;
          planned_pickup_at: string | null;
          route_polyline: string | null;
          shipment_id: string;
          status: string;
          updated_at: string;
          vehicle_id: string | null;
        };
        Insert: {
          actual_delivery_at?: string | null;
          actual_pickup_at?: string | null;
          assigned_at?: string;
          assigned_by?: string | null;
          carrier_id: string;
          created_at?: string;
          distance_km?: number | null;
          driver_id?: string | null;
          id?: string;
          planned_delivery_at?: string | null;
          planned_pickup_at?: string | null;
          route_polyline?: string | null;
          shipment_id: string;
          status?: string;
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Update: {
          actual_delivery_at?: string | null;
          actual_pickup_at?: string | null;
          assigned_at?: string;
          assigned_by?: string | null;
          carrier_id?: string;
          created_at?: string;
          distance_km?: number | null;
          driver_id?: string | null;
          id?: string;
          planned_delivery_at?: string | null;
          planned_pickup_at?: string | null;
          route_polyline?: string | null;
          shipment_id?: string;
          status?: string;
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shipment_assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipment_assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "shipment_assignments_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "carriers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipment_assignments_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipment_assignments_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: true;
            referencedRelation: "buyer_shipments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipment_assignments_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      shipment_route_stops: {
        Row: {
          address: string | null;
          arrived_at: string | null;
          assignment_id: string;
          created_at: string;
          departed_at: string | null;
          eta: string | null;
          id: string;
          lat: number | null;
          lng: number | null;
          notes: string | null;
          sequence: number;
          stop_type: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          arrived_at?: string | null;
          assignment_id: string;
          created_at?: string;
          departed_at?: string | null;
          eta?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          notes?: string | null;
          sequence: number;
          stop_type?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          arrived_at?: string | null;
          assignment_id?: string;
          created_at?: string;
          departed_at?: string | null;
          eta?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          notes?: string | null;
          sequence?: number;
          stop_type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shipment_route_stops_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "shipment_assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      silos: {
        Row: {
          admin_id: string;
          auto_alerts: boolean | null;
          batch_dispatched_date: string | null;
          batch_loaded_date: string | null;
          capacity_kg: number;
          created_at: string | null;
          created_by: string;
          current_batch_id: string | null;
          current_conditions: Json | null;
          current_occupancy_kg: number | null;
          deleted_at: string | null;
          dimensions: Json | null;
          id: string;
          is_active: boolean | null;
          last_cleaning_date: string | null;
          last_inspection_date: string | null;
          location: Json | null;
          name: string;
          next_inspection_date: string | null;
          notes: string | null;
          origin_device_serial: string | null;
          origin_order_id: string | null;
          sensors: Json | null;
          silo_id: string;
          statistics: Json | null;
          status: Database["public"]["Enums"]["device_status"] | null;
          tags: string[] | null;
          temperature_control: Json | null;
          thresholds: Json | null;
          updated_at: string | null;
          updated_by: string | null;
          ventilation_system: Json | null;
          warehouse_id: string;
        };
        Insert: {
          admin_id: string;
          auto_alerts?: boolean | null;
          batch_dispatched_date?: string | null;
          batch_loaded_date?: string | null;
          capacity_kg: number;
          created_at?: string | null;
          created_by: string;
          current_batch_id?: string | null;
          current_conditions?: Json | null;
          current_occupancy_kg?: number | null;
          deleted_at?: string | null;
          dimensions?: Json | null;
          id?: string;
          is_active?: boolean | null;
          last_cleaning_date?: string | null;
          last_inspection_date?: string | null;
          location?: Json | null;
          name: string;
          next_inspection_date?: string | null;
          notes?: string | null;
          origin_device_serial?: string | null;
          origin_order_id?: string | null;
          sensors?: Json | null;
          silo_id: string;
          statistics?: Json | null;
          status?: Database["public"]["Enums"]["device_status"] | null;
          tags?: string[] | null;
          temperature_control?: Json | null;
          thresholds?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
          ventilation_system?: Json | null;
          warehouse_id: string;
        };
        Update: {
          admin_id?: string;
          auto_alerts?: boolean | null;
          batch_dispatched_date?: string | null;
          batch_loaded_date?: string | null;
          capacity_kg?: number;
          created_at?: string | null;
          created_by?: string;
          current_batch_id?: string | null;
          current_conditions?: Json | null;
          current_occupancy_kg?: number | null;
          deleted_at?: string | null;
          dimensions?: Json | null;
          id?: string;
          is_active?: boolean | null;
          last_cleaning_date?: string | null;
          last_inspection_date?: string | null;
          location?: Json | null;
          name?: string;
          next_inspection_date?: string | null;
          notes?: string | null;
          origin_device_serial?: string | null;
          origin_order_id?: string | null;
          sensors?: Json | null;
          silo_id?: string;
          statistics?: Json | null;
          status?: Database["public"]["Enums"]["device_status"] | null;
          tags?: string[] | null;
          temperature_control?: Json | null;
          thresholds?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
          ventilation_system?: Json | null;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_silos_current_batch";
            columns: ["current_batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "silos_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "silos_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "silos_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "silos_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "silos_origin_order_id_fkey";
            columns: ["origin_order_id"];
            isOneToOne: false;
            referencedRelation: "hardware_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "silos_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "silos_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "silos_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "silos_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      spoilage_predictions: {
        Row: {
          batch_id: string | null;
          co2: number | null;
          confidence: number | null;
          factors: Json | null;
          humidity: number | null;
          id: string;
          moisture: number | null;
          prediction_timestamp: string;
          risk_class: string | null;
          risk_score: number | null;
          silo_id: string | null;
          storage_days: number | null;
          temperature: number | null;
          voc: number | null;
        };
        Insert: {
          batch_id?: string | null;
          co2?: number | null;
          confidence?: number | null;
          factors?: Json | null;
          humidity?: number | null;
          id?: string;
          moisture?: number | null;
          prediction_timestamp?: string;
          risk_class?: string | null;
          risk_score?: number | null;
          silo_id?: string | null;
          storage_days?: number | null;
          temperature?: number | null;
          voc?: number | null;
        };
        Update: {
          batch_id?: string | null;
          co2?: number | null;
          confidence?: number | null;
          factors?: Json | null;
          humidity?: number | null;
          id?: string;
          moisture?: number | null;
          prediction_timestamp?: string;
          risk_class?: string | null;
          risk_score?: number | null;
          silo_id?: string | null;
          storage_days?: number | null;
          temperature?: number | null;
          voc?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "spoilage_predictions_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "spoilage_predictions_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "spoilage_predictions_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_events: {
        Row: {
          id: string;
          received_at: string;
          type: string;
        };
        Insert: {
          id: string;
          received_at?: string;
          type: string;
        };
        Update: {
          id?: string;
          received_at?: string;
          type?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          admin_id: string;
          advanced_analytics: boolean | null;
          ai_features: boolean | null;
          auto_renew: boolean | null;
          billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null;
          cancel_at: string | null;
          canceled_at: string | null;
          cancellation_date: string | null;
          cancellation_reason: string | null;
          created_at: string | null;
          created_by: string | null;
          currency: string | null;
          custom_integrations: boolean | null;
          deleted_at: string | null;
          discount_amount: number | null;
          discount_percentage: number | null;
          end_date: string;
          id: string;
          last_payment_date: string | null;
          last_synced_at: string | null;
          latest_invoice_id: string | null;
          max_actuators: number | null;
          max_batches: number | null;
          max_devices: number | null;
          max_sensors: number | null;
          max_silos: number | null;
          max_storage_gb: number | null;
          max_users: number | null;
          max_warehouses: number | null;
          next_payment_date: string | null;
          notes: string | null;
          notified_expiry_thresholds: number[];
          payment_method: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"] | null;
          plan_description: string | null;
          plan_name: Database["public"]["Enums"]["plan_name"];
          price: number | null;
          price_per_month: number;
          price_per_year: number | null;
          priority_support: boolean | null;
          promo_code: string | null;
          start_date: string;
          status: Database["public"]["Enums"]["subscription_status"] | null;
          stripe_customer_id: string | null;
          stripe_price_id: string | null;
          stripe_subscription_id: string | null;
          trial_end_date: string | null;
          updated_at: string | null;
          usage_batches: number | null;
          usage_devices: number | null;
          usage_storage_gb: number | null;
          usage_users: number | null;
        };
        Insert: {
          admin_id: string;
          advanced_analytics?: boolean | null;
          ai_features?: boolean | null;
          auto_renew?: boolean | null;
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null;
          cancel_at?: string | null;
          canceled_at?: string | null;
          cancellation_date?: string | null;
          cancellation_reason?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          custom_integrations?: boolean | null;
          deleted_at?: string | null;
          discount_amount?: number | null;
          discount_percentage?: number | null;
          end_date: string;
          id?: string;
          last_payment_date?: string | null;
          last_synced_at?: string | null;
          latest_invoice_id?: string | null;
          max_actuators?: number | null;
          max_batches?: number | null;
          max_devices?: number | null;
          max_sensors?: number | null;
          max_silos?: number | null;
          max_storage_gb?: number | null;
          max_users?: number | null;
          max_warehouses?: number | null;
          next_payment_date?: string | null;
          notes?: string | null;
          notified_expiry_thresholds?: number[];
          payment_method?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"] | null;
          plan_description?: string | null;
          plan_name?: Database["public"]["Enums"]["plan_name"];
          price?: number | null;
          price_per_month?: number;
          price_per_year?: number | null;
          priority_support?: boolean | null;
          promo_code?: string | null;
          start_date?: string;
          status?: Database["public"]["Enums"]["subscription_status"] | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_end_date?: string | null;
          updated_at?: string | null;
          usage_batches?: number | null;
          usage_devices?: number | null;
          usage_storage_gb?: number | null;
          usage_users?: number | null;
        };
        Update: {
          admin_id?: string;
          advanced_analytics?: boolean | null;
          ai_features?: boolean | null;
          auto_renew?: boolean | null;
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null;
          cancel_at?: string | null;
          canceled_at?: string | null;
          cancellation_date?: string | null;
          cancellation_reason?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          custom_integrations?: boolean | null;
          deleted_at?: string | null;
          discount_amount?: number | null;
          discount_percentage?: number | null;
          end_date?: string;
          id?: string;
          last_payment_date?: string | null;
          last_synced_at?: string | null;
          latest_invoice_id?: string | null;
          max_actuators?: number | null;
          max_batches?: number | null;
          max_devices?: number | null;
          max_sensors?: number | null;
          max_silos?: number | null;
          max_storage_gb?: number | null;
          max_users?: number | null;
          max_warehouses?: number | null;
          next_payment_date?: string | null;
          notes?: string | null;
          notified_expiry_thresholds?: number[];
          payment_method?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"] | null;
          plan_description?: string | null;
          plan_name?: Database["public"]["Enums"]["plan_name"];
          price?: number | null;
          price_per_month?: number;
          price_per_year?: number | null;
          priority_support?: boolean | null;
          promo_code?: string | null;
          start_date?: string;
          status?: Database["public"]["Enums"]["subscription_status"] | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_end_date?: string | null;
          updated_at?: string | null;
          usage_batches?: number | null;
          usage_devices?: number | null;
          usage_storage_gb?: number | null;
          usage_users?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "subscriptions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      suppliers: {
        Row: {
          address: string | null;
          admin_id: string;
          city: string | null;
          country: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["supplier_kind"];
          metadata: Json;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          admin_id: string;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["supplier_kind"];
          metadata?: Json;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          admin_id?: string;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["supplier_kind"];
          metadata?: Json;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tax_registrations: {
        Row: {
          created_at: string;
          id: string;
          region: string;
          registration_number: string;
          rule_type: string;
          seller_id: string;
          updated_at: string;
          verified: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          region: string;
          registration_number: string;
          rule_type: string;
          seller_id: string;
          updated_at?: string;
          verified?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          region?: string;
          registration_number?: string;
          rule_type?: string;
          seller_id?: string;
          updated_at?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "tax_registrations_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_registrations_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      tax_rules: {
        Row: {
          active: boolean;
          applies_to: string;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          notes: string | null;
          rate_pct: number;
          region: string;
          rule_type: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          applies_to: string;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          notes?: string | null;
          rate_pct: number;
          region: string;
          rule_type: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          applies_to?: string;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          notes?: string | null;
          rate_pct?: number;
          region?: string;
          rule_type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      technician_warehouse_assignments: {
        Row: {
          admin_id: string;
          assigned_by: string | null;
          city: string;
          created_at: string;
          id: string;
          is_primary: boolean | null;
          technician_id: string;
          updated_at: string;
          warehouse_id: string;
        };
        Insert: {
          admin_id: string;
          assigned_by?: string | null;
          city: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean | null;
          technician_id: string;
          updated_at?: string;
          warehouse_id: string;
        };
        Update: {
          admin_id?: string;
          assigned_by?: string | null;
          city?: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean | null;
          technician_id?: string;
          updated_at?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "technician_warehouse_assignments_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "technician_warehouse_assignments_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "technician_warehouse_assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "technician_warehouse_assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "technician_warehouse_assignments_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "technician_warehouse_assignments_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "technician_warehouse_assignments_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "technician_warehouse_assignments_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_plan_change_requests: {
        Row: {
          apply_at: string | null;
          billing_cycle: string | null;
          charge_amount_cents: number | null;
          created_at: string;
          current_plan: string | null;
          decided_at: string | null;
          decided_by: string | null;
          direction: string;
          downgrade_reason: string | null;
          downgrade_reason_details: string | null;
          id: string;
          note: string | null;
          requested_by: string;
          requested_plan: string;
          retention_offer_declined: boolean | null;
          status: string;
          stripe_session_id: string | null;
          tenant_admin_id: string;
          updated_at: string;
        };
        Insert: {
          apply_at?: string | null;
          billing_cycle?: string | null;
          charge_amount_cents?: number | null;
          created_at?: string;
          current_plan?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          direction: string;
          downgrade_reason?: string | null;
          downgrade_reason_details?: string | null;
          id?: string;
          note?: string | null;
          requested_by: string;
          requested_plan: string;
          retention_offer_declined?: boolean | null;
          status?: string;
          stripe_session_id?: string | null;
          tenant_admin_id: string;
          updated_at?: string;
        };
        Update: {
          apply_at?: string | null;
          billing_cycle?: string | null;
          charge_amount_cents?: number | null;
          created_at?: string;
          current_plan?: string | null;
          decided_at?: string | null;
          decided_by?: string | null;
          direction?: string;
          downgrade_reason?: string | null;
          downgrade_reason_details?: string | null;
          id?: string;
          note?: string | null;
          requested_by?: string;
          requested_plan?: string;
          retention_offer_declined?: boolean | null;
          status?: string;
          stripe_session_id?: string | null;
          tenant_admin_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_plan_change_requests_requested_plan_fkey";
            columns: ["requested_plan"];
            isOneToOne: false;
            referencedRelation: "plan_thresholds";
            referencedColumns: ["plan_id"];
          },
          {
            foreignKeyName: "tenant_plan_change_requests_tenant_admin_id_fkey";
            columns: ["tenant_admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_plan_change_requests_tenant_admin_id_fkey";
            columns: ["tenant_admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
      tenant_price_settings: {
        Row: {
          admin_id: string;
          created_at: string;
          currency: string;
          default_margin_pct: number;
          per_grain_margin: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          admin_id: string;
          created_at?: string;
          currency?: string;
          default_margin_pct?: number;
          per_grain_margin?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          admin_id?: string;
          created_at?: string;
          currency?: string;
          default_margin_pct?: number;
          per_grain_margin?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string | null;
          granted_by: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          granted_by?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          granted_by?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          active: boolean;
          avg_kmpl: number | null;
          capacity_kg: number;
          carrier_id: string;
          created_at: string;
          current_status: string;
          fuel_type: string | null;
          id: string;
          notes: string | null;
          registration_no: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          avg_kmpl?: number | null;
          capacity_kg?: number;
          carrier_id: string;
          created_at?: string;
          current_status?: string;
          fuel_type?: string | null;
          id?: string;
          notes?: string | null;
          registration_no: string;
          type?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          avg_kmpl?: number | null;
          capacity_kg?: number;
          carrier_id?: string;
          created_at?: string;
          current_status?: string;
          fuel_type?: string | null;
          id?: string;
          notes?: string | null;
          registration_no?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_carrier_id_fkey";
            columns: ["carrier_id"];
            isOneToOne: false;
            referencedRelation: "carriers";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist_emails: {
        Row: {
          created_at: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
      warehouse_metrics: {
        Row: {
          active_silos_count: number | null;
          admin_id: string;
          created_at: string;
          humidity_violations_count: number | null;
          id: string;
          metric_date: string;
          occupied_capacity_kg: number;
          quality_incidents_count: number | null;
          spoilage_incidents_count: number | null;
          temperature_violations_count: number | null;
          total_batches_dispatched: number | null;
          total_batches_stored: number | null;
          total_capacity_kg: number;
          updated_at: string;
          utilization_percent: number | null;
          warehouse_id: string;
        };
        Insert: {
          active_silos_count?: number | null;
          admin_id: string;
          created_at?: string;
          humidity_violations_count?: number | null;
          id?: string;
          metric_date?: string;
          occupied_capacity_kg?: number;
          quality_incidents_count?: number | null;
          spoilage_incidents_count?: number | null;
          temperature_violations_count?: number | null;
          total_batches_dispatched?: number | null;
          total_batches_stored?: number | null;
          total_capacity_kg?: number;
          updated_at?: string;
          utilization_percent?: number | null;
          warehouse_id: string;
        };
        Update: {
          active_silos_count?: number | null;
          admin_id?: string;
          created_at?: string;
          humidity_violations_count?: number | null;
          id?: string;
          metric_date?: string;
          occupied_capacity_kg?: number;
          quality_incidents_count?: number | null;
          spoilage_incidents_count?: number | null;
          temperature_violations_count?: number | null;
          total_batches_dispatched?: number | null;
          total_batches_stored?: number | null;
          total_capacity_kg?: number;
          updated_at?: string;
          utilization_percent?: number | null;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_metrics_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_metrics_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "warehouse_metrics_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "warehouse_metrics_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouses: {
        Row: {
          admin_id: string;
          auto_alerts: boolean | null;
          created_at: string | null;
          created_by: string;
          deleted_at: string | null;
          id: string;
          is_active: boolean | null;
          location: Json | null;
          location_address: string | null;
          location_city: string | null;
          manager_id: string | null;
          name: string;
          notes: string | null;
          origin_order_id: string | null;
          statistics: Json | null;
          status: Database["public"]["Enums"]["device_status"] | null;
          tags: string[] | null;
          technician_ids: string[] | null;
          total_capacity_kg: number | null;
          total_silos: number | null;
          updated_at: string | null;
          updated_by: string | null;
          warehouse_id: string;
        };
        Insert: {
          admin_id: string;
          auto_alerts?: boolean | null;
          created_at?: string | null;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          location?: Json | null;
          location_address?: string | null;
          location_city?: string | null;
          manager_id?: string | null;
          name: string;
          notes?: string | null;
          origin_order_id?: string | null;
          statistics?: Json | null;
          status?: Database["public"]["Enums"]["device_status"] | null;
          tags?: string[] | null;
          technician_ids?: string[] | null;
          total_capacity_kg?: number | null;
          total_silos?: number | null;
          updated_at?: string | null;
          updated_by?: string | null;
          warehouse_id: string;
        };
        Update: {
          admin_id?: string;
          auto_alerts?: boolean | null;
          created_at?: string | null;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          location?: Json | null;
          location_address?: string | null;
          location_city?: string | null;
          manager_id?: string | null;
          name?: string;
          notes?: string | null;
          origin_order_id?: string | null;
          statistics?: Json | null;
          status?: Database["public"]["Enums"]["device_status"] | null;
          tags?: string[] | null;
          technician_ids?: string[] | null;
          total_capacity_kg?: number | null;
          total_silos?: number | null;
          updated_at?: string | null;
          updated_by?: string | null;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouses_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouses_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "warehouses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "warehouses_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouses_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "warehouses_origin_order_id_fkey";
            columns: ["origin_order_id"];
            isOneToOne: false;
            referencedRelation: "hardware_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouses_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouses_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
    };
    Views: {
      aggregated_sensor_readings_5m: {
        Row: {
          avg_co2: number | null;
          avg_humidity: number | null;
          avg_moisture: number | null;
          avg_temp: number | null;
          avg_voc: number | null;
          batch_id: string | null;
          device_id: string | null;
          max_humidity: number | null;
          max_temp: number | null;
          min_humidity: number | null;
          min_temp: number | null;
          reading_count: number | null;
          silo_id: string | null;
          time_bucket: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sensor_readings_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "grain_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_readings_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "sensor_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_readings_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sensor_readings_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
        ];
      };
      mobile_buyer_summary_v: {
        Row: {
          active_orders: number | null;
          buyer_user_id: string | null;
          in_flight_orders: number | null;
          unread_messages: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "buyer_orders_buyer_id_fkey";
            columns: ["buyer_user_id"];
            isOneToOne: false;
            referencedRelation: "buyers";
            referencedColumns: ["id"];
          },
        ];
      };
      mobile_field_task_v: {
        Row: {
          assignee_user_id: string | null;
          body: string | null;
          order_id: string | null;
          priority: string | null;
          silo_id: string | null;
          status: string | null;
          task_key: string | null;
          task_type: string | null;
          tenant_id: string | null;
          title: string | null;
          updated_at: string | null;
        };
        Relationships: [];
      };
      mobile_marketplace_v: {
        Row: {
          available_kg: number | null;
          commodity: string | null;
          cover_image_url: string | null;
          currency: string | null;
          description: string | null;
          grade: string | null;
          id: string | null;
          min_order_kg: number | null;
          price_per_kg: number | null;
          seller_id: string | null;
          seller_name: string | null;
          slug: string | null;
          status: Database["public"]["Enums"]["listing_status"] | null;
          title: string | null;
          updated_at: string | null;
          visibility: Database["public"]["Enums"]["listing_visibility"] | null;
        };
        Relationships: [];
      };
      mobile_silo_cockpit_v: {
        Row: {
          admin_id: string | null;
          capacity_kg: number | null;
          current_occupancy_kg: number | null;
          id: string | null;
          latest_reading: Json | null;
          name: string | null;
          open_alerts: number | null;
          status: Database["public"]["Enums"]["device_status"] | null;
          updated_at: string | null;
          warehouse_id: string | null;
        };
        Insert: {
          admin_id?: string | null;
          capacity_kg?: number | null;
          current_occupancy_kg?: number | null;
          id?: string | null;
          latest_reading?: never;
          name?: string | null;
          open_alerts?: never;
          status?: Database["public"]["Enums"]["device_status"] | null;
          updated_at?: string | null;
          warehouse_id?: string | null;
        };
        Update: {
          admin_id?: string | null;
          capacity_kg?: number | null;
          current_occupancy_kg?: number | null;
          id?: string | null;
          latest_reading?: never;
          name?: string | null;
          open_alerts?: never;
          status?: Database["public"]["Enums"]["device_status"] | null;
          updated_at?: string | null;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "silos_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "silos_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "silos_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouse_operations_summary_v";
            referencedColumns: ["warehouse_id"];
          },
          {
            foreignKeyName: "silos_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      public_listings_v: {
        Row: {
          available_from: string | null;
          available_kg: number | null;
          cover_image_url: string | null;
          created_at: string | null;
          currency: string | null;
          description: string | null;
          grade: string | null;
          grain_type: Database["public"]["Enums"]["grain_type"] | null;
          id: string | null;
          min_order_kg: number | null;
          price_per_kg: number | null;
          slug: string | null;
          title: string | null;
          variety: string | null;
          warehouse_location: Json | null;
          warehouse_name: string | null;
        };
        Relationships: [];
      };
      seller_reputation: {
        Row: {
          admin_id: string | null;
          avg_rating: number | null;
          avg_transit_hours: number | null;
          delivered_count: number | null;
          dispute_count: number | null;
          dispute_rate: number | null;
          fulfillment_score: number | null;
          on_time_count: number | null;
          on_time_rate: number | null;
          review_count_90d: number | null;
          review_count_total: number | null;
        };
        Relationships: [];
      };
      silo_pool_summary: {
        Row: {
          active_batch_count: number | null;
          admin_id: string | null;
          oldest_intake_at: string | null;
          silo_id: string | null;
          total_on_hand_kg: number | null;
          weighted_avg_cost: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "grain_batches_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
          {
            foreignKeyName: "grain_batches_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "mobile_silo_cockpit_v";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grain_batches_silo_id_fkey";
            columns: ["silo_id"];
            isOneToOne: false;
            referencedRelation: "silos";
            referencedColumns: ["id"];
          },
        ];
      };
      technician_performance_v: {
        Row: {
          assigned_warehouses: number | null;
          avg_overall_rating: number | null;
          avg_technician_rating: number | null;
          completed_installations: number | null;
          current_job_count: number | null;
          service_cities: string[] | null;
          technician_email: string | null;
          technician_id: string | null;
          technician_name: string | null;
          technician_status: Database["public"]["Enums"]["technician_status"] | null;
          total_installations: number | null;
        };
        Relationships: [];
      };
      warehouse_operations_summary_v: {
        Row: {
          active_batches: number | null;
          active_silos: number | null;
          admin_id: string | null;
          location_desc: string | null;
          quality_incidents: number | null;
          recent_alerts: number | null;
          status: Database["public"]["Enums"]["device_status"] | null;
          temp_violations: number | null;
          total_capacity_kg: number | null;
          total_occupied_kg: number | null;
          total_silos: number | null;
          utilization_percent: number | null;
          warehouse_code: string | null;
          warehouse_id: string | null;
          warehouse_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "warehouses_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouses_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "technician_performance_v";
            referencedColumns: ["technician_id"];
          },
        ];
      };
    };
    Functions: {
      advance_install_stage: {
        Args: { _next: string; _note?: string; _order_id: string };
        Returns: Json;
      };
      check_plan_limit_exceeded: {
        Args: { admin_user_id: string; resource_type: string };
        Returns: boolean;
      };
      decrement_technician_jobs: {
        Args: { tech_id: string };
        Returns: undefined;
      };
      delete_field_ticket: {
        Args: { p_ticket_id: string; p_user_id: string };
        Returns: undefined;
      };
      get_admin_warehouse_count: {
        Args: { admin_user_id: string };
        Returns: number;
      };
      get_available_technicians_for_warehouse: {
        Args: { warehouse_uuid: string };
        Returns: {
          current_jobs: number;
          email: string;
          max_jobs: number;
          name: string;
          phone: string;
          status: Database["public"]["Enums"]["technician_status"];
          technician_id: string;
        }[];
      };
      get_my_role: {
        Args: { _user_id: string };
        Returns: Database["public"]["Enums"]["app_role"];
      };
      get_tenant_admin_id: { Args: { _user_id: string }; Returns: string };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      increment_technician_jobs: {
        Args: { tech_id: string };
        Returns: undefined;
      };
      is_super_admin: { Args: { _user_id: string }; Returns: boolean };
      is_super_admin_user: { Args: never; Returns: boolean };
      keyword_search: {
        Args: {
          match_count?: number;
          query_tenant_id: string;
          query_text: string;
        };
        Returns: {
          category: string;
          chunk_content: string;
          document_title: string;
          id: string;
          metadata: Json;
          rank: number;
        }[];
      };
      match_documents: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          query_embedding: string;
          query_tenant_id: string;
        };
        Returns: {
          category: string;
          chunk_content: string;
          document_title: string;
          id: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      notify_install_progress: {
        Args: {
          _event: string;
          _message: string;
          _order_id: string;
          _title: string;
        };
        Returns: undefined;
      };
      recalc_batch_remaining: {
        Args: { _batch_id: string };
        Returns: undefined;
      };
      record_governance_audit: {
        Args: {
          _action: string;
          _after: Json;
          _before: Json;
          _target_key: string;
          _target_type: string;
        };
        Returns: string;
      };
      resolve_dashboard_share: { Args: { _token: string }; Returns: Json };
      run_metric: { Args: { _filters?: Json; _key: string }; Returns: Json };
    };
    Enums: {
      actuator_type: "fan" | "vent" | "heater" | "cooler" | "alarm" | "light";
      alert_priority: "low" | "medium" | "high" | "critical";
      alert_status:
        | "pending"
        | "acknowledged"
        | "resolved"
        | "escalated"
        | "closed"
        | "open"
        | "investigating"
        | "dismissed";
      app_role: "super_admin" | "admin" | "manager" | "technician" | "pending" | "buyer";
      batch_status:
        | "stored"
        | "dispatched"
        | "sold"
        | "damaged"
        | "expired"
        | "on_hold"
        | "processing"
        | "intake"
        | "treatment"
        | "ready"
        | "rejected"
        | "pending_approval"
        | "pending_qc"
        | "qc_submitted"
        | "qc_failed"
        | "qc_passed"
        | "admin_rejected";
      billing_cycle: "monthly" | "yearly" | "quarterly";
      buyer_order_status:
        | "pending"
        | "confirmed"
        | "invoiced"
        | "paid"
        | "dispatched"
        | "completed"
        | "cancelled"
        | "refunded";
      buyer_status: "active" | "paused" | "inactive";
      buyer_type: "local_mill" | "exporter" | "wholesaler" | "retailer" | "government";
      device_status: "active" | "offline" | "error" | "maintenance";
      dispute_status: "open" | "under_review" | "resolved" | "rejected";
      grain_type: "Wheat" | "Rice" | "Maize" | "Corn" | "Barley" | "Sorghum";
      hardware_order_status:
        | "pending_payment"
        | "new"
        | "approved"
        | "tech_assigned"
        | "installed"
        | "live"
        | "cancelled"
        | "completed"
        | "paid";
      invitation_status: "pending" | "accepted" | "declined";
      listing_status: "draft" | "active" | "paused" | "sold_out" | "archived";
      listing_visibility: "private" | "buyer_network" | "public";
      notification_cat:
        | "batch"
        | "spoilage"
        | "dispatch"
        | "payment"
        | "insurance"
        | "invoice"
        | "system";
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
      plan_name:
        | "Grain Starter"
        | "Grain Professional"
        | "Grain Enterprise"
        | "Grain Enterprise Plus"
        | "Custom";
      power_source: "solar" | "battery" | "direct" | "hybrid";
      refund_state: "pending" | "succeeded" | "failed" | "cancelled";
      review_direction: "buyer_to_seller" | "seller_to_buyer";
      review_status: "pending" | "published" | "rejected";
      sensor_type:
        | "temperature"
        | "humidity"
        | "co2"
        | "voc"
        | "moisture"
        | "light"
        | "pressure"
        | "ph";
      shipment_status: "queued" | "in_transit" | "out_for_delivery" | "delivered" | "exception";
      spoilage_label: "Safe" | "Risky" | "Spoiled";
      subscription_status: "active" | "inactive" | "cancelled" | "expired" | "trial";
      supplier_kind: "external" | "own_farm" | "internal_transfer" | "anonymous";
      technician_status: "available" | "busy" | "offline" | "on_leave";
      user_status: "active" | "inactive" | "deleted";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      actuator_type: ["fan", "vent", "heater", "cooler", "alarm", "light"],
      alert_priority: ["low", "medium", "high", "critical"],
      alert_status: [
        "pending",
        "acknowledged",
        "resolved",
        "escalated",
        "closed",
        "open",
        "investigating",
        "dismissed",
      ],
      app_role: ["super_admin", "admin", "manager", "technician", "pending", "buyer"],
      batch_status: [
        "stored",
        "dispatched",
        "sold",
        "damaged",
        "expired",
        "on_hold",
        "processing",
        "intake",
        "treatment",
        "ready",
        "rejected",
        "pending_approval",
        "pending_qc",
        "qc_submitted",
        "qc_failed",
        "qc_passed",
        "admin_rejected",
      ],
      billing_cycle: ["monthly", "yearly", "quarterly"],
      buyer_order_status: [
        "pending",
        "confirmed",
        "invoiced",
        "paid",
        "dispatched",
        "completed",
        "cancelled",
        "refunded",
      ],
      buyer_status: ["active", "paused", "inactive"],
      buyer_type: ["local_mill", "exporter", "wholesaler", "retailer", "government"],
      device_status: ["active", "offline", "error", "maintenance"],
      dispute_status: ["open", "under_review", "resolved", "rejected"],
      grain_type: ["Wheat", "Rice", "Maize", "Corn", "Barley", "Sorghum"],
      hardware_order_status: [
        "pending_payment",
        "new",
        "approved",
        "tech_assigned",
        "installed",
        "live",
        "cancelled",
        "completed",
        "paid",
      ],
      invitation_status: ["pending", "accepted", "declined"],
      listing_status: ["draft", "active", "paused", "sold_out", "archived"],
      listing_visibility: ["private", "buyer_network", "public"],
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
      refund_state: ["pending", "succeeded", "failed", "cancelled"],
      review_direction: ["buyer_to_seller", "seller_to_buyer"],
      review_status: ["pending", "published", "rejected"],
      sensor_type: ["temperature", "humidity", "co2", "voc", "moisture", "light", "pressure", "ph"],
      shipment_status: ["queued", "in_transit", "out_for_delivery", "delivered", "exception"],
      spoilage_label: ["Safe", "Risky", "Spoiled"],
      subscription_status: ["active", "inactive", "cancelled", "expired", "trial"],
      supplier_kind: ["external", "own_farm", "internal_transfer", "anonymous"],
      technician_status: ["available", "busy", "offline", "on_leave"],
      user_status: ["active", "inactive", "deleted"],
    },
  },
} as const;
