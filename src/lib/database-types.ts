// Tipos do schema público (correspondentes a db/schema.sql).
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
export type TxType = "deposit" | "withdraw" | "transfer_in" | "transfer_out" | "commission";
export type TxStatus = "pending" | "completed" | "failed" | "expired";
export type AppRole = "admin" | "user";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; telegram_id: number | null; username: string | null;
          first_name: string | null; photo_url: string | null; affiliate_code: string;
          referred_by: string | null; pin_hash: string | null; blocked: boolean; created_at: string;
        };
        Insert: { id: string } & Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      wallets: {
        Row: {
          user_id: string; balance: number; total_deposited: number; total_withdrawn: number;
          affiliate_earnings: number; referrals_count: number; updated_at: string;
        };
        Insert: { user_id: string } & Partial<Database["public"]["Tables"]["wallets"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["wallets"]["Row"]>;
      };
      transactions: {
        Row: {
          id: string; user_id: string; type: TxType; amount: number; fee: number;
          status: TxStatus; description: string | null; counterpart: string | null;
          reference_id: string | null; created_at: string;
        };
        Insert: { user_id: string; type: TxType; amount: number } & Partial<Database["public"]["Tables"]["transactions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["transactions"]["Row"]>;
      };
      deposits: {
        Row: {
          id: string; user_id: string; amount: number; pix_code: string | null; qr_code: string | null;
          status: TxStatus; provider: string | null; provider_ref: string | null;
          created_at: string; expires_at: string | null; paid_at: string | null;
        };
        Insert: { user_id: string; amount: number } & Partial<Database["public"]["Tables"]["deposits"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["deposits"]["Row"]>;
      };
      withdrawals: {
        Row: {
          id: string; user_id: string; pix_key: string; amount: number; fee: number; net: number;
          status: TxStatus; created_at: string; processed_at: string | null;
        };
        Insert: { user_id: string; pix_key: string; amount: number; net: number } & Partial<Database["public"]["Tables"]["withdrawals"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["withdrawals"]["Row"]>;
      };
      affiliates: {
        Row: { referrer_id: string; referred_id: string; created_at: string };
        Insert: { referrer_id: string; referred_id: string };
        Update: Partial<{ referrer_id: string; referred_id: string; created_at: string }>;
      };
      commissions: {
        Row: {
          id: string; referrer_id: string; referred_id: string; transaction_id: string | null;
          amount: number; status: TxStatus; created_at: string;
        };
        Insert: { referrer_id: string; referred_id: string; amount: number } & Partial<Database["public"]["Tables"]["commissions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["commissions"]["Row"]>;
      };
      settings: {
        Row: { key: string; value: Json; updated_at: string };
        Insert: { key: string; value: Json };
        Update: Partial<{ key: string; value: Json; updated_at: string }>;
      };
      user_roles: {
        Row: { id: string; user_id: string; role: AppRole; created_at: string };
        Insert: { user_id: string; role: AppRole };
        Update: Partial<{ user_id: string; role: AppRole }>;
      };
      admin_logs: {
        Row: {
          id: string; admin_id: string; action: string; target_user_id: string | null;
          metadata: Json | null; ip: string | null; created_at: string;
        };
        Insert: { admin_id: string; action: string } & Partial<Database["public"]["Tables"]["admin_logs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["admin_logs"]["Row"]>;
      };
      login_history: {
        Row: { id: string; user_id: string; ip: string | null; user_agent: string | null; created_at: string };
        Insert: { user_id: string } & Partial<Database["public"]["Tables"]["login_history"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["login_history"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: { has_role: { Args: { _user_id: string; _role: AppRole }; Returns: boolean } };
    Enums: { app_role: AppRole; tx_type: TxType; tx_status: TxStatus };
  };
}
