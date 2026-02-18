/**
 * Supabase Database Types
 *
 * Manually maintained types derived from the migration files in
 * supabase/migrations/. Keep in sync when the schema changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BackendType = 'none' | 'supabase' | 'firebase' | 'convex';

export type PlanName = 'none' | 'starter' | 'pro' | 'max';

export type DismissalScope = 'project' | 'scan';

export type ApiKeyScope = 'scan:read' | 'scan:write' | 'keys:read' | 'keys:manage';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          credits: number;
          plan: PlanName;
          plan_domains: number;
          plan_scans_limit: number;
          plan_scans_used: number;
          plan_period_start: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          allowed_domains: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          credits?: number;
          plan?: PlanName;
          plan_domains?: number;
          plan_scans_limit?: number;
          plan_scans_used?: number;
          plan_period_start?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          allowed_domains?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          credits?: number;
          plan?: PlanName;
          plan_domains?: number;
          plan_scans_limit?: number;
          plan_scans_used?: number;
          plan_period_start?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          allowed_domains?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scans: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          url: string;
          status: string;
          overall_score: number | null;
          results: Json | null;
          ai_analysis: Json | null;
          public_id: string | null;
          scanners_completed: number;
          scanners_total: number;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          url: string;
          status: string;
          overall_score?: number | null;
          results?: Json | null;
          ai_analysis?: Json | null;
          public_id?: string | null;
          scanners_completed?: number;
          scanners_total?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          url?: string;
          status?: string;
          overall_score?: number | null;
          results?: Json | null;
          ai_analysis?: Json | null;
          public_id?: string | null;
          scanners_completed?: number;
          scanners_total?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scans_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scans_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          url: string;
          github_repo: string | null;
          backend_type: BackendType;
          backend_url: string | null;
          supabase_pat: string | null;
          favicon_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          url: string;
          github_repo?: string | null;
          backend_type?: BackendType;
          backend_url?: string | null;
          supabase_pat?: string | null;
          favicon_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          url?: string;
          github_repo?: string | null;
          backend_type?: BackendType;
          backend_url?: string | null;
          supabase_pat?: string | null;
          favicon_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          key_hash: string;
          key_prefix: string;
          name: string;
          scopes: ApiKeyScope[];
          allowed_domains: string[] | null;
          allowed_ips: string[] | null;
          is_active: boolean;
          expires_at: string | null;
          revoked_at: string | null;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          key_hash: string;
          key_prefix: string;
          name?: string;
          scopes?: ApiKeyScope[];
          allowed_domains?: string[] | null;
          allowed_ips?: string[] | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          key_hash?: string;
          key_prefix?: string;
          name?: string;
          scopes?: ApiKeyScope[];
          allowed_domains?: string[] | null;
          allowed_ips?: string[] | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          last_used_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'api_keys_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      api_key_usage_log: {
        Row: {
          id: number;
          key_id: string | null;
          user_id: string;
          endpoint: string;
          method: string;
          ip_address: string | null;
          status_code: number | null;
          created_at: string;
        };
        Insert: {
          id?: never; // GENERATED ALWAYS AS IDENTITY
          key_id?: string | null;
          user_id: string;
          endpoint: string;
          method: string;
          ip_address?: string | null;
          status_code?: number | null;
          created_at?: string;
        };
        Update: {
          key_id?: string | null;
          user_id?: string;
          endpoint?: string;
          method?: string;
          ip_address?: string | null;
          status_code?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'api_key_usage_log_key_id_fkey';
            columns: ['key_id'];
            referencedRelation: 'api_keys';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'api_key_usage_log_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      dismissed_findings: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          scan_id: string | null;
          fingerprint: string;
          reason: string;
          note: string | null;
          scope: DismissalScope;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          scan_id?: string | null;
          fingerprint: string;
          reason: string;
          note?: string | null;
          scope?: DismissalScope;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          scan_id?: string | null;
          fingerprint?: string;
          reason?: string;
          note?: string | null;
          scope?: DismissalScope;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dismissed_findings_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dismissed_findings_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dismissed_findings_scan_id_fkey';
            columns: ['scan_id'];
            referencedRelation: 'scans';
            referencedColumns: ['id'];
          },
        ];
      };
      waitlist_emails: {
        Row: {
          id: string;
          email: string;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      processed_webhook_events: {
        Row: {
          event_id: string;
          event_type: string;
          processed_at: string;
        };
        Insert: {
          event_id: string;
          event_type: string;
          processed_at?: string;
        };
        Update: {
          event_id?: string;
          event_type?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
      rate_limit_windows: {
        Row: {
          identifier: string;
          window_start: string;
          request_count: number;
        };
        Insert: {
          identifier: string;
          window_start: string;
          request_count?: number;
        };
        Update: {
          identifier?: string;
          window_start?: string;
          request_count?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_rate_limit: {
        Args: {
          p_identifier: string;
          p_max_requests: number;
          p_window_seconds?: number;
        };
        Returns: {
          allowed: boolean;
          current_count: number;
          limit_max: number;
          reset_at: string;
        }[];
      };
      validate_api_key: {
        Args: {
          p_key_hash: string;
        };
        Returns: {
          key_id: string;
          user_id: string;
          scopes: string[];
          allowed_domains: string[] | null;
          allowed_ips: string[] | null;
          plan: string;
          plan_scans_used: number;
          plan_scans_limit: number;
          plan_domains: number;
          user_allowed_domains: string[];
        }[];
      };
      increment_scan_usage: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          success: boolean;
          plan: string;
          plan_scans_used: number;
          plan_scans_limit: number;
          plan_domains: number;
          allowed_domains: string[];
        }[];
      };
      register_scan_domain: {
        Args: {
          p_user_id: string;
          p_domain: string;
        };
        Returns: {
          success: boolean;
          allowed_domains: string[];
        }[];
      };
      check_project_limit: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          allowed: boolean;
          current_count: number;
          project_limit: number;
        }[];
      };
      cleanup_usage_logs: {
        Args: {
          p_days?: number;
        };
        Returns: number;
      };
      cleanup_rate_limit_windows: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/** Convenience type aliases */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type DbFunctions = Database['public']['Functions'];
