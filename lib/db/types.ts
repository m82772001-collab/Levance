/**
 * Minimal checked schema types used by the application until Supabase CLI
 * type generation is available in CI. Keep this aligned with migrations.
 */
export type UserRole = "customer" | "admin";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; role: UserRole; created_at: string };
        Insert: { id: string; full_name?: string | null; role?: UserRole };
        Update: { full_name?: string | null; role?: UserRole };
      };
      products: {
        Row: {
          id: string; slug: string; name: string; description: string | null;
          category_id: string | null; brand: string | null; brand_id: string | null;
          is_active: boolean; cj_product_id: string | null; created_at: string;
          updated_at: string; supplier_cost_cents: number | null; attributes: Record<string, unknown>;
          model_url: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & { slug: string; name: string };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
      };
      assistant_memory: {
        Row: { id: string; user_id: string; memory_key: string; memory_value: string; source: "explicit" | "inferred" | "system"; created_at: string; updated_at: string };
        Insert: { user_id: string; memory_key: string; memory_value: string; source?: "explicit" | "inferred" | "system" };
        Update: Partial<{ memory_key: string; memory_value: string; source: "explicit" | "inferred" | "system" }>;
      };
      trend_snapshots: {
        Row: { id: string; source: string; captured_at: string; terms: unknown[]; raw_payload: Record<string, unknown>; created_at: string };
        Insert: { source: string; captured_at?: string; terms?: unknown[]; raw_payload?: Record<string, unknown> };
        Update: Partial<{ source: string; captured_at: string; terms: unknown[]; raw_payload: Record<string, unknown> }>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { user_role: UserRole };
  };
}
